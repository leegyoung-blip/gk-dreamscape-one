"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type AdminUser = {
  id: string;
  email: string | null;
  username: string | null;
  role: string | null;
  created_at: string;
  dreamTokenBalance: number;
};

type TokenAction = "class_attendance" | "manual_add" | "manual_deduct";

const tokenActions: {
  id: TokenAction;
  label: string;
  description: string;
}[] = [
  {
    id: "class_attendance",
    label: "Class Attendance +100",
    description: "Add 100 virtual Dream Tokens.",
  },
  {
    id: "manual_add",
    label: "Manual Add",
    description: "Manually add virtual Dream Tokens.",
  },
  {
    id: "manual_deduct",
    label: "Manual Deduct",
    description: "Manually deduct virtual Dream Tokens.",
  },
];

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function DreamTokensAdminPage() {
  const router = useRouter();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [search, setSearch] = useState("");

  const [selectedAction, setSelectedAction] =
    useState<TokenAction>("class_attendance");
  const [manualAmount, setManualAmount] = useState(50);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const selectedUser = users.find((user) => user.id === selectedUserId);

  const totalUsers = users.length;

  const totalDreamTokens = useMemo(() => {
    return users.reduce((total, user) => total + user.dreamTokenBalance, 0);
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

  const finalAmount = useMemo(() => {
    if (selectedAction === "class_attendance") return 100;

    const amount = Math.abs(Number(manualAmount) || 0);

    if (selectedAction === "manual_add") return amount;
    if (selectedAction === "manual_deduct") return -amount;

    return 0;
  }, [selectedAction, manualAmount]);

  const actionTitle = useMemo(() => {
    if (selectedAction === "class_attendance") {
      return "Class Attendance Reward";
    }

    if (selectedAction === "manual_add") {
      return "Admin Manual Add";
    }

    return "Admin Manual Deduct";
  }, [selectedAction]);

  useEffect(() => {
    async function loadUsers() {
      setIsLoading(true);
      setMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        setMessage(userError.message);
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

      if (adminError) {
        setMessage(adminError.message);
        setIsLoading(false);
        return;
      }

      if (adminProfile?.role?.trim().toLowerCase() !== "admin") {
        router.replace("/profile");
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, username, role, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) {
        setMessage(`Unable to load users: ${profilesError.message}`);
        setIsLoading(false);
        return;
      }

      const userIds = (profiles || []).map((profile) => profile.id);

      let tokenRows: {
        user_id: string;
        amount: number;
      }[] = [];

      if (userIds.length > 0) {
        const { data: transactions, error: tokenError } = await supabase
          .from("dream_token_transactions")
          .select("user_id, amount")
          .eq("token_kind", "virtual")
          .in("user_id", userIds);

        if (tokenError) {
          setMessage(`Unable to load token balances: ${tokenError.message}`);
          setIsLoading(false);
          return;
        }

        tokenRows = transactions || [];
      }

      const usersWithBalances = (profiles || []).map((profile) => {
        const dreamTokenBalance = tokenRows
          .filter((transaction) => transaction.user_id === profile.id)
          .reduce(
            (total, transaction) => total + Number(transaction.amount),
            0
          );

        return {
          id: profile.id,
          email: profile.email,
          username: profile.username,
          role: profile.role || "free_user",
          created_at: profile.created_at,
          dreamTokenBalance,
        };
      });

      setUsers(usersWithBalances);
      setIsLoading(false);
    }

    loadUsers();
  }, [router]);

  async function submitReward() {
    setMessage("");

    if (!selectedUserId) {
      setMessage("Please select a user first.");
      return;
    }

    if (finalAmount === 0) {
      setMessage("Token amount cannot be zero.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from("dream_token_transactions").insert({
      user_id: selectedUserId,
      amount: finalAmount,
      token_kind: "virtual",
      type: finalAmount > 0 ? "earn" : "spend",
      title: actionTitle,
    });

    if (error) {
      setMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    setUsers((currentUsers) =>
      currentUsers.map((user) => {
        if (user.id !== selectedUserId) return user;

        return {
          ...user,
          dreamTokenBalance: user.dreamTokenBalance + finalAmount,
        };
      })
    );

    setMessage("Dream Tokens updated successfully.");
    setIsSubmitting(false);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020813] px-5 py-8 text-white sm:px-8 sm:py-10">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(126,232,255,0.2),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.16),transparent_36%),linear-gradient(180deg,#041124_0%,#020813_100%)]" />
        <div className="absolute left-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-[-140px] right-[-120px] h-[380px] w-[380px] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <button
        type="button"
        onClick={() => router.push("/profile")}
        className="relative z-30 rounded-full border border-cyan-200/25 bg-white/8 px-5 py-3 text-sm tracking-wide text-white shadow-[0_16px_36px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:scale-[1.03] hover:border-cyan-200/45"
      >
        ← Back to Profile
      </button>

      <div className="relative z-10 mx-auto mt-10 max-w-6xl">
        <section>
          <p className="m-0 text-xs font-bold uppercase tracking-[0.3em] text-[#7ee8ff]">
            GKP Admin
          </p>

          <h1 className="mt-4 text-5xl font-extralight tracking-[-0.05em] text-white drop-shadow-[0_0_28px_rgba(126,232,255,0.18)] sm:text-7xl">
            Dream Token Admin
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-white/62">
            Add or deduct virtual Dream Tokens from any account, including
            students, regular users, teachers, and admins.
          </p>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
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

          <div className="rounded-3xl border border-violet-200/16 bg-violet-400/[0.07] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.18em] text-white/42">
              Access
            </p>

            <p className="mt-2 text-4xl font-extrabold tracking-[-0.04em] text-white">
              Admin
            </p>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px]">
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

            <div className="milo-admin-scroll mt-5 max-h-[520px] space-y-3 overflow-y-auto pr-2">
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
                  const role = user.role?.trim() || "free_user";
                  const isAdminUser = role.toLowerCase() === "admin";

                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUserId(user.id)}
                      className={`w-full rounded-2xl border px-5 py-4 text-left transition ${
                        isSelected
                          ? "border-yellow-300/50 bg-yellow-300/12 shadow-[0_0_30px_rgba(250,204,21,0.12)]"
                          : "border-cyan-200/12 bg-[#061632]/70 hover:border-cyan-200/30 hover:bg-[#082044]/75"
                      }`}
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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

                        <span className="w-fit rounded-full border border-yellow-200/20 bg-yellow-200/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#ffd18a]">
                          {user.dreamTokenBalance.toLocaleString()} DT
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="h-fit rounded-[32px] border border-yellow-300/28 bg-[linear-gradient(180deg,rgba(112,57,18,0.36),rgba(4,20,48,0.82))] p-6 shadow-[0_0_42px_rgba(250,204,21,0.08),0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:p-7">
            <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-[#ffd18a]">
              Token Action
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white">
              Update Wallet
            </h2>

            {selectedUser ? (
              <div className="mt-5 rounded-2xl border border-yellow-200/16 bg-black/24 p-5">
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
                  Role: {selectedUser.role || "free_user"}
                </p>

                <div className="mt-4 rounded-2xl border border-yellow-200/14 bg-yellow-200/8 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/42">
                    Current Balance
                  </p>

                  <p className="mt-2 text-4xl font-extrabold tracking-[-0.04em] text-[#ffd18a]">
                    {selectedUser.dreamTokenBalance.toLocaleString()} DT
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/52">
                Select a user from the list.
              </p>
            )}

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
                  tokenActions.find((action) => action.id === selectedAction)
                    ?.description
                }
              </p>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <p className="text-xs text-white/42">Virtual Tokens</p>

                <p
                  className={`mt-1 text-3xl font-extrabold tracking-[-0.04em] ${
                    finalAmount < 0 ? "text-red-300" : "text-green-300"
                  }`}
                >
                  {finalAmount > 0 ? "+" : ""}
                  {finalAmount.toLocaleString()}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={submitReward}
              disabled={isSubmitting || !selectedUserId}
              className="mt-6 w-full rounded-full border border-yellow-200/24 bg-yellow-200/14 px-5 py-4 text-sm font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_14px_34px_rgba(250,204,21,0.08)] transition hover:scale-[1.01] hover:bg-yellow-200/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Updating..." : "Update Dream Tokens"}
            </button>

            {message && (
              <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm leading-6 text-white/72">
                {message}
              </p>
            )}
          </section>
        </div>
      </div>

      <style jsx>{`
        .milo-admin-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(126, 232, 255, 0.35) rgba(255, 255, 255, 0.08);
        }

        .milo-admin-scroll::-webkit-scrollbar {
          width: 8px;
        }

        .milo-admin-scroll::-webkit-scrollbar-thumb {
          background: rgba(126, 232, 255, 0.35);
          border-radius: 999px;
        }
      `}</style>
    </main>
  );
}