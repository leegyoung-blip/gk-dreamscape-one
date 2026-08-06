"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import RoleManagementPanel from "@/components/admin/RoleManagementPanel";

type AdminUser = {
  id: string;
  email: string | null;
  username: string | null;
  role: string | null;
  created_at: string;
  dreamTokenBalance: number;
  dreamGemBalance: number;
};


type AdminSection = "currency" | "teachers" | "roles";

type DirectoryUser = {
  user_id: string;
  email: string | null;
  display_name: string;
  user_role: string;
  teacher_type: string | null;
  organization_name: string | null;
  teacher_license_status: string | null;
  assigned_student_count: number;
};

type DirectoryRpcRow = {
  user_id: unknown;
  email: unknown;
  display_name: unknown;
  user_role: unknown;
  teacher_type: unknown;
  organization_name: unknown;
  teacher_license_status: unknown;
  assigned_student_count: unknown;
};

type TeacherAssignment = {
  student_user_id: string;
  student_label: string;
  student_email: string | null;
  class_label: string | null;
  is_active: boolean;
  assigned_at: string;
};

type TeacherAssignmentRpcRow = {
  student_user_id: unknown;
  student_label: unknown;
  student_email: unknown;
  class_label: unknown;
  is_active: unknown;
  assigned_at: unknown;
};

type TeacherType = "gkp" | "external";
type LicenceStatus = "active" | "inactive" | "suspended";

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

const GKP_BILLING_URL =
  process.env.NEXT_PUBLIC_GKP_BILLING_URL?.trim() || "";

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

  const [activeSection, setActiveSection] =
    useState<AdminSection>("currency");
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
    function handleAdminRoleUpdate(event: Event) {
      const detail = (event as CustomEvent<{ userId: string; role: string }>).detail;
      if (!detail?.userId) return;

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === detail.userId ? { ...user, role: detail.role } : user
        )
      );
    }

    window.addEventListener("dream-admin-role-updated", handleAdminRoleUpdate);
    return () =>
      window.removeEventListener(
        "dream-admin-role-updated",
        handleAdminRoleUpdate
      );
  }, []);

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

      <div className="relative z-30 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/profile")}
          className="rounded-full border border-cyan-200/25 bg-white/[0.08] px-5 py-3 text-sm tracking-wide text-white shadow-[0_16px_36px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:scale-[1.03] hover:border-cyan-200/45"
        >
          ← Back to Profile
        </button>

        {GKP_BILLING_URL ? (
          <a
            href={GKP_BILLING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-emerald-200/30 bg-emerald-300/12 px-5 py-3 text-sm font-extrabold tracking-wide text-emerald-100 shadow-[0_16px_36px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:scale-[1.03] hover:border-emerald-200/50 hover:bg-emerald-300/18"
          >
            Open GKP Billing ↗
          </a>
        ) : (
          <span
            title="Add NEXT_PUBLIC_GKP_BILLING_URL in Vercel."
            className="cursor-not-allowed rounded-full border border-white/10 bg-white/[0.035] px-5 py-3 text-sm font-bold tracking-wide text-white/34"
          >
            GKP Billing URL Not Set
          </span>
        )}
      </div>

      <div className="relative z-10 mx-auto mt-10 max-w-7xl">
        <section>
          <p className="m-0 text-xs font-bold uppercase tracking-[0.3em] text-[#7ee8ff]">
            GKP Admin
          </p>

          <h1 className="mt-4 text-5xl font-extralight tracking-[-0.05em] text-white drop-shadow-[0_0_28px_rgba(126,232,255,0.18)] sm:text-7xl">
            Dreamscape Administration
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-7 text-white/62">
            Manage Dream Tokens, Dream Gems, teacher licences, and the student
            rosters shown inside each teacher dashboard.
          </p>

          {pageMessage && (
            <p className="mt-5 max-w-3xl rounded-2xl border border-red-200/18 bg-red-400/10 px-5 py-4 text-sm leading-6 text-red-100">
              {pageMessage}
            </p>
          )}
        </section>

        <section className="mt-8 flex flex-col gap-3 rounded-[28px] border border-cyan-200/16 bg-white/[0.04] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:flex-row">
          <button
            type="button"
            onClick={() => setActiveSection("currency")}
            className={`min-h-14 flex-1 rounded-2xl border px-5 text-sm font-extrabold uppercase tracking-[0.12em] transition ${
              activeSection === "currency"
                ? "border-yellow-200/35 bg-yellow-200/12 text-[#ffd18a] shadow-[0_0_28px_rgba(250,204,21,0.08)]"
                : "border-white/10 bg-white/[0.035] text-white/58 hover:border-white/20 hover:text-white"
            }`}
          >
            Dream Currency
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("teachers")}
            className={`min-h-14 flex-1 rounded-2xl border px-5 text-sm font-extrabold uppercase tracking-[0.12em] transition ${
              activeSection === "teachers"
                ? "border-cyan-200/40 bg-cyan-300/12 text-[#8dfcff] shadow-[0_0_28px_rgba(83,215,255,0.1)]"
                : "border-white/10 bg-white/[0.035] text-white/58 hover:border-white/20 hover:text-white"
            }`}
          >
            Teacher Licensing & Rosters
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("roles")}
            className={`min-h-14 flex-1 rounded-2xl border px-5 text-sm font-extrabold uppercase tracking-[0.12em] transition ${
              activeSection === "roles"
                ? "border-violet-200/40 bg-violet-300/12 text-violet-100 shadow-[0_0_28px_rgba(167,139,250,0.1)]"
                : "border-white/10 bg-white/[0.035] text-white/58 hover:border-white/20 hover:text-white"
            }`}
          >
            User Roles
          </button>
        </section>

        {activeSection === "currency" ? (
          <>
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
          </>
        ) : activeSection === "teachers" ? (
          <TeacherLicensingPanel />
        ) : (
          <RoleManagementPanel />
        )}
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


function normaliseRole(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

function isTeachingRole(value: string | null | undefined) {
  const role = normaliseRole(value);

  return role === "teacher" || role === "curriculum-lead";
}

function TeacherLicensingPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(
    null
  );
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [assignmentLabels, setAssignmentLabels] = useState<
    Record<string, string>
  >({});

  const [teacherSearch, setTeacherSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [showAssignedOnly, setShowAssignedOnly] = useState(false);

  const [teacherType, setTeacherType] = useState<TeacherType>("external");
  const [organizationName, setOrganizationName] = useState("");
  const [licenceStatus, setLicenceStatus] =
    useState<LicenceStatus>("active");

  const [candidateUserId, setCandidateUserId] = useState("");
  const [candidateTeacherType, setCandidateTeacherType] =
    useState<TeacherType>("external");
  const [candidateOrganization, setCandidateOrganization] = useState("");

  useEffect(() => {
    void loadDirectory();
  }, []);

  useEffect(() => {
    if (!selectedTeacherId) {
      setAssignments([]);
      setAssignmentLabels({});
      return;
    }

    void loadAssignments(selectedTeacherId);
  }, [selectedTeacherId]);

  async function loadDirectory(preferredTeacherId?: string) {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "admin_get_teacher_assignment_directory"
    );

    if (error) {
      setDirectory([]);
      setErrorMessage(
        error.message || "Could not load the teacher assignment directory."
      );
      setIsLoading(false);
      return;
    }

    const directoryRows = (data ?? []) as DirectoryRpcRow[];
    const rows: DirectoryUser[] = directoryRows.map(
      (row): DirectoryUser => ({
        user_id: String(row.user_id),
        email: row.email ? String(row.email) : null,
        display_name: String(row.display_name || "User"),
        user_role: normaliseRole(row.user_role || "regular"),
        teacher_type: row.teacher_type ? String(row.teacher_type) : null,
        organization_name: row.organization_name
          ? String(row.organization_name)
          : null,
        teacher_license_status: row.teacher_license_status
          ? String(row.teacher_license_status)
          : null,
        assigned_student_count: Number(row.assigned_student_count || 0),
      }),
    );

    setDirectory(rows);

    const teacherRows = rows.filter((row) => row.user_role === "teacher");
    const nextTeacherId =
      preferredTeacherId &&
      teacherRows.some((row) => row.user_id === preferredTeacherId)
        ? preferredTeacherId
        : selectedTeacherId &&
            teacherRows.some((row) => row.user_id === selectedTeacherId)
          ? selectedTeacherId
          : teacherRows[0]?.user_id ?? null;

    setSelectedTeacherId(nextTeacherId);

    const selected = teacherRows.find(
      (teacher) => teacher.user_id === nextTeacherId
    );
    if (selected) syncTeacherForm(selected);

    setIsLoading(false);
  }

  async function loadAssignments(teacherId: string) {
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "admin_get_teacher_assignments",
      { p_teacher_user_id: teacherId }
    );

    if (error) {
      setAssignments([]);
      setAssignmentLabels({});
      setErrorMessage(error.message || "Could not load teacher assignments.");
      return;
    }

    const assignmentRows = (data ?? []) as TeacherAssignmentRpcRow[];
    const nextAssignments: TeacherAssignment[] = assignmentRows.map(
      (row): TeacherAssignment => ({
        student_user_id: String(row.student_user_id),
        student_label: String(row.student_label || "Student"),
        student_email: row.student_email ? String(row.student_email) : null,
        class_label: row.class_label ? String(row.class_label) : null,
        is_active: Boolean(row.is_active),
        assigned_at: String(
          row.assigned_at || new Date().toISOString(),
        ),
      }),
    );

    setAssignments(nextAssignments);
    setAssignmentLabels(
      Object.fromEntries(
        nextAssignments.map((assignment) => [
          assignment.student_user_id,
          assignment.class_label || "",
        ])
      )
    );
  }

  function syncTeacherForm(teacher: DirectoryUser) {
    setTeacherType(teacher.teacher_type === "gkp" ? "gkp" : "external");
    setOrganizationName(teacher.organization_name || "");
    setLicenceStatus(
      teacher.teacher_license_status === "suspended"
        ? "suspended"
        : teacher.teacher_license_status === "inactive"
          ? "inactive"
          : "active"
    );
  }

  function selectTeacher(teacher: DirectoryUser) {
    setSelectedTeacherId(teacher.user_id);
    syncTeacherForm(teacher);
    setMessage("");
    setErrorMessage("");
  }

  async function createTeacher() {
    if (!candidateUserId) {
      setErrorMessage("Choose an existing regular account first.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("admin_update_teacher_profile", {
      p_user_id: candidateUserId,
      p_make_teacher: true,
      p_teacher_type: candidateTeacherType,
      p_organization_name: candidateOrganization.trim() || null,
      p_license_status: "active",
    });

    if (error) {
      setErrorMessage(error.message || "Could not create the teacher profile.");
      setIsSaving(false);
      return;
    }

    const newTeacherId = candidateUserId;
    setCandidateUserId("");
    setCandidateOrganization("");
    setMessage("Teacher role and active licence added.");
    window.dispatchEvent(
      new CustomEvent("dream-admin-role-updated", {
        detail: { userId: newTeacherId, role: "teacher" },
      })
    );
    await loadDirectory(newTeacherId);
    setIsSaving(false);
  }

  async function saveTeacherProfile() {
    if (!selectedTeacherId) return;

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("admin_update_teacher_profile", {
      p_user_id: selectedTeacherId,
      p_make_teacher: true,
      p_teacher_type: teacherType,
      p_organization_name: organizationName.trim() || null,
      p_license_status: licenceStatus,
    });

    if (error) {
      setErrorMessage(error.message || "Could not update the teacher profile.");
      setIsSaving(false);
      return;
    }

    setMessage("Teacher licence settings saved.");
    await loadDirectory(selectedTeacherId);
    setIsSaving(false);
  }

  async function removeTeacherRole() {
    if (!selectedTeacherId) return;

    const confirmed = window.confirm(
      "Remove the Teacher role? All current student assignments will be deactivated."
    );
    if (!confirmed) return;

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("admin_update_teacher_profile", {
      p_user_id: selectedTeacherId,
      p_make_teacher: false,
      p_teacher_type: "external",
      p_organization_name: null,
      p_license_status: "inactive",
    });

    if (error) {
      setErrorMessage(error.message || "Could not remove the teacher role.");
      setIsSaving(false);
      return;
    }

    setMessage("Teacher role removed and roster access deactivated.");
    window.dispatchEvent(
      new CustomEvent("dream-admin-role-updated", {
        detail: { userId: selectedTeacherId, role: "regular" },
      })
    );
    setSelectedTeacherId(null);
    await loadDirectory();
    setIsSaving(false);
  }

  async function setAssignment(student: DirectoryUser, isAssigned: boolean) {
    if (!selectedTeacherId) return;

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "admin_set_teacher_student_assignment",
      {
        p_teacher_user_id: selectedTeacherId,
        p_student_user_id: student.user_id,
        p_is_assigned: isAssigned,
        p_student_label: student.display_name,
        p_class_label: assignmentLabels[student.user_id]?.trim() || null,
      }
    );

    if (error) {
      setErrorMessage(error.message || "Could not update the assignment.");
      setIsSaving(false);
      return;
    }

    setMessage(
      isAssigned
        ? `${student.display_name} was added to the teacher roster.`
        : `${student.display_name} was removed from the active roster.`
    );

    await Promise.all([
      loadAssignments(selectedTeacherId),
      loadDirectory(selectedTeacherId),
    ]);
    setIsSaving(false);
  }

  async function saveClassLabel(student: DirectoryUser) {
    const assignment = assignments.find(
      (item) => item.student_user_id === student.user_id
    );

    if (!assignment?.is_active) {
      setErrorMessage("Assign the student before saving a class label.");
      return;
    }

    await setAssignment(student, true);
  }

  const teachers = useMemo(
    () => directory.filter((user) => isTeachingRole(user.user_role)),
    [directory]
  );

  const students = useMemo(
    () => directory.filter((user) => user.user_role === "student"),
    [directory]
  );

  const regularCandidates = useMemo(
    () => directory.filter((user) => user.user_role === "regular"),
    [directory]
  );

  const filteredTeachers = useMemo(() => {
    const term = teacherSearch.trim().toLowerCase();
    if (!term) return teachers;

    return teachers.filter(
      (teacher) =>
        teacher.display_name.toLowerCase().includes(term) ||
        String(teacher.email || "").toLowerCase().includes(term) ||
        String(teacher.organization_name || "").toLowerCase().includes(term)
    );
  }, [teachers, teacherSearch]);

  const activeAssignmentIds = useMemo(
    () =>
      new Set(
        assignments
          .filter((assignment) => assignment.is_active)
          .map((assignment) => assignment.student_user_id)
      ),
    [assignments]
  );

  const filteredStudents = useMemo(() => {
    const term = studentSearch.trim().toLowerCase();

    return students.filter((student) => {
      if (showAssignedOnly && !activeAssignmentIds.has(student.user_id)) {
        return false;
      }

      if (!term) return true;

      return (
        student.display_name.toLowerCase().includes(term) ||
        String(student.email || "").toLowerCase().includes(term)
      );
    });
  }, [students, studentSearch, showAssignedOnly, activeAssignmentIds]);

  const selectedTeacher = teachers.find(
    (teacher) => teacher.user_id === selectedTeacherId
  );

  const activeTeacherCount = teachers.filter(
    (teacher) => teacher.teacher_license_status === "active"
  ).length;
  const activeAssignmentCount = assignments.filter(
    (assignment) => assignment.is_active
  ).length;

  return (
    <section className="mt-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminMetricCard
          label="Teacher Accounts"
          value={isLoading ? "..." : teachers.length.toLocaleString()}
          tone="cyan"
        />
        <AdminMetricCard
          label="Active Licences"
          value={isLoading ? "..." : activeTeacherCount.toLocaleString()}
          tone="green"
        />
        <AdminMetricCard
          label="Selected Roster"
          value={isLoading ? "..." : activeAssignmentCount.toLocaleString()}
          tone="violet"
        />
      </div>

      {message && (
        <p className="mt-5 rounded-2xl border border-green-200/20 bg-green-400/10 px-5 py-4 text-sm text-green-100">
          {message}
        </p>
      )}

      {errorMessage && (
        <p className="mt-5 rounded-2xl border border-red-200/20 bg-red-400/10 px-5 py-4 text-sm text-red-100">
          {errorMessage}
        </p>
      )}

      <section className="mt-6 rounded-[32px] border border-cyan-200/18 bg-white/[0.045] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-[#8dfcff]">
              Add teacher
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white">
              Convert an existing regular account
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/52">
              The database role is stored as teacher. GKP Teacher and External
              Teacher are licence types rather than additional account roles.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-[1.25fr_0.8fr_1fr_auto] xl:items-end">
          <AdminField label="Account">
            <select
              value={candidateUserId}
              onChange={(event) => setCandidateUserId(event.target.value)}
              className={adminInputClass}
            >
              <option value="">Choose regular account</option>
              {regularCandidates.map((user) => (
                <option key={user.user_id} value={user.user_id}>
                  {user.display_name} · {user.email || "No email"}
                </option>
              ))}
            </select>
          </AdminField>

          <AdminField label="Teacher type">
            <select
              value={candidateTeacherType}
              onChange={(event) =>
                setCandidateTeacherType(event.target.value as TeacherType)
              }
              className={adminInputClass}
            >
              <option value="gkp">GKP Teacher</option>
              <option value="external">External Teacher</option>
            </select>
          </AdminField>

          <AdminField label="Organisation">
            <input
              value={candidateOrganization}
              onChange={(event) =>
                setCandidateOrganization(event.target.value)
              }
              placeholder="School, centre or company"
              className={adminInputClass}
            />
          </AdminField>

          <button
            type="button"
            disabled={isSaving || !candidateUserId}
            onClick={() => void createTeacher()}
            className={adminPrimaryButtonClass}
          >
            {isSaving ? "Saving..." : "Add Teacher Role"}
          </button>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="h-fit rounded-[32px] border border-cyan-200/18 bg-white/[0.045] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl xl:sticky xl:top-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-[#8dfcff]">
                Licensed accounts
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em]">
                Teachers
              </h2>
            </div>
            <strong className="text-3xl text-[#8dfcff]">
              {teachers.length}
            </strong>
          </div>

          <input
            value={teacherSearch}
            onChange={(event) => setTeacherSearch(event.target.value)}
            placeholder="Search teacher or organisation"
            className={`${adminInputClass} mt-5`}
          />

          <div className="dream-admin-scroll mt-4 max-h-[620px] space-y-2 overflow-y-auto pr-1">
            {isLoading ? (
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-white/48">
                Loading teachers...
              </p>
            ) : filteredTeachers.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-white/48">
                No teacher accounts found.
              </p>
            ) : (
              filteredTeachers.map((teacher) => {
                const selected = selectedTeacherId === teacher.user_id;
                const licence = teacher.teacher_license_status || "inactive";

                return (
                  <button
                    type="button"
                    key={teacher.user_id}
                    onClick={() => selectTeacher(teacher)}
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      selected
                        ? "border-cyan-200/45 bg-cyan-300/10"
                        : "border-white/10 bg-white/[0.025] hover:border-cyan-200/24"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/16 bg-cyan-300/10 font-extrabold text-[#8dfcff]">
                        {teacher.display_name.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm text-white">
                          {teacher.display_name}
                        </strong>
                        <small className="mt-1 block truncate text-[11px] text-white/42">
                          {teacher.organization_name ||
                            (teacher.teacher_type === "gkp"
                              ? "Guru Kids Pro"
                              : "External organisation")}
                        </small>
                        <small className="mt-1 block text-[10px] text-white/30">
                          {teacher.assigned_student_count} active students
                        </small>
                      </span>
                      <LicenceBadge status={licence} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="min-w-0 space-y-6">
          {!selectedTeacher ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-[32px] border border-cyan-200/18 bg-white/[0.045] p-8 text-center text-white/48 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl">
              Add or select a teacher account to manage its licence and roster.
            </div>
          ) : (
            <>
              <article className="rounded-[32px] border border-cyan-200/18 bg-white/[0.045] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:p-7">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-[#8dfcff]">
                      Teacher profile
                    </p>
                    <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em]">
                      {selectedTeacher.display_name}
                    </h2>
                    <p className="mt-2 break-all text-sm text-white/48">
                      {selectedTeacher.email || "No email"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-cyan-200/14 bg-cyan-300/[0.07] px-6 py-4 text-center">
                    <strong className="block text-3xl text-[#8dfcff]">
                      {selectedTeacher.assigned_student_count}
                    </strong>
                    <span className="text-xs text-white/42">
                      active students
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-[0.8fr_1.2fr_0.8fr_auto] xl:items-end">
                  <AdminField label="Teacher type">
                    <select
                      value={teacherType}
                      onChange={(event) =>
                        setTeacherType(event.target.value as TeacherType)
                      }
                      className={adminInputClass}
                    >
                      <option value="gkp">GKP Teacher</option>
                      <option value="external">External Teacher</option>
                    </select>
                  </AdminField>

                  <AdminField label="Organisation">
                    <input
                      value={organizationName}
                      onChange={(event) =>
                        setOrganizationName(event.target.value)
                      }
                      placeholder="School, centre or company"
                      className={adminInputClass}
                    />
                  </AdminField>

                  <AdminField label="Licence status">
                    <select
                      value={licenceStatus}
                      onChange={(event) =>
                        setLicenceStatus(event.target.value as LicenceStatus)
                      }
                      className={adminInputClass}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </AdminField>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void saveTeacherProfile()}
                    className={adminPrimaryButtonClass}
                  >
                    Save Licence
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href={`/teacher-dashboard?teacherId=${encodeURIComponent(
                      selectedTeacher.user_id,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-cyan-200/28 bg-cyan-300/12 px-5 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-[#8dfcff] no-underline transition hover:bg-cyan-300/18"
                  >
                    Open Teacher Dashboard ↗
                  </a>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void removeTeacherRole()}
                    className="rounded-full border border-red-200/24 bg-red-400/10 px-5 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-red-100 transition hover:bg-red-400/16 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Remove Teacher Role
                  </button>
                </div>
              </article>

              <article className="rounded-[32px] border border-cyan-200/18 bg-white/[0.045] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:p-7">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-[#8dfcff]">
                      Dashboard roster
                    </p>
                    <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em]">
                      Assign students
                    </h2>
                    <p className="mt-2 text-sm text-white/48">
                      Only active assignments appear inside this teacher’s
                      dashboard.
                    </p>
                  </div>

                  <label className="flex min-h-11 w-fit items-center gap-3 rounded-full border border-cyan-200/16 bg-cyan-300/[0.06] px-4 text-xs font-bold text-white/70">
                    <input
                      type="checkbox"
                      checked={showAssignedOnly}
                      onChange={(event) =>
                        setShowAssignedOnly(event.target.checked)
                      }
                      className="h-4 w-4 accent-cyan-300"
                    />
                    Assigned only
                  </label>
                </div>

                <input
                  value={studentSearch}
                  onChange={(event) => setStudentSearch(event.target.value)}
                  placeholder="Search student name or email"
                  className={`${adminInputClass} mt-5`}
                />

                <div className="dream-admin-scroll mt-4 max-h-[720px] space-y-3 overflow-y-auto pr-1">
                  {filteredStudents.length === 0 ? (
                    <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-5 text-center text-sm text-white/48">
                      No students match this filter.
                    </p>
                  ) : (
                    filteredStudents.map((student) => {
                      const assigned = activeAssignmentIds.has(student.user_id);

                      return (
                        <div
                          key={student.user_id}
                          className={`grid gap-3 rounded-2xl border p-4 lg:grid-cols-[48px_minmax(0,1fr)_minmax(150px,0.75fr)_auto] lg:items-center ${
                            assigned
                              ? "border-green-200/22 bg-green-400/[0.045]"
                              : "border-white/10 bg-white/[0.025]"
                          }`}
                        >
                          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200/16 bg-cyan-300/10 font-extrabold text-[#8dfcff]">
                            {student.display_name.charAt(0).toUpperCase()}
                          </span>

                          <span className="min-w-0">
                            <strong className="block truncate text-sm text-white">
                              {student.display_name}
                            </strong>
                            <small className="mt-1 block truncate text-[11px] text-white/42">
                              {student.email || "No email"}
                            </small>
                          </span>

                          <input
                            value={assignmentLabels[student.user_id] || ""}
                            onChange={(event) =>
                              setAssignmentLabels((current) => ({
                                ...current,
                                [student.user_id]: event.target.value,
                              }))
                            }
                            placeholder="Class label"
                            className={adminInputClass}
                          />

                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() =>
                                void setAssignment(student, !assigned)
                              }
                              className={`min-h-10 rounded-full border px-4 text-xs font-extrabold uppercase tracking-[0.1em] transition disabled:cursor-not-allowed disabled:opacity-45 ${
                                assigned
                                  ? "border-red-200/22 bg-red-400/10 text-red-100"
                                  : "border-green-200/22 bg-green-400/10 text-green-100"
                              }`}
                            >
                              {assigned ? "Remove" : "Assign"}
                            </button>

                            {assigned && (
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => void saveClassLabel(student)}
                                className="min-h-10 rounded-full border border-cyan-200/22 bg-cyan-300/10 px-4 text-xs font-extrabold uppercase tracking-[0.1em] text-[#8dfcff] transition disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                Save Class
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </article>
            </>
          )}
        </section>
      </div>
    </section>
  );
}

function AdminMetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "cyan" | "green" | "violet";
}) {
  const toneClass =
    tone === "green"
      ? "border-green-200/18 bg-green-400/[0.06] text-green-200"
      : tone === "violet"
        ? "border-violet-200/18 bg-violet-400/[0.06] text-violet-200"
        : "border-cyan-200/18 bg-cyan-400/[0.06] text-[#8dfcff]";

  return (
    <div
      className={`rounded-3xl border p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl ${toneClass}`}
    >
      <p className="text-xs uppercase tracking-[0.18em] text-white/42">
        {label}
      </p>
      <p className="mt-2 text-4xl font-extrabold tracking-[-0.04em]">
        {value}
      </p>
    </div>
  );
}

function AdminField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-white/42">
        {label}
      </span>
      {children}
    </label>
  );
}

function LicenceBadge({ status }: { status: string }) {
  const className =
    status === "active"
      ? "border-green-200/18 bg-green-400/10 text-green-200"
      : status === "suspended"
        ? "border-red-200/18 bg-red-400/10 text-red-200"
        : "border-yellow-200/18 bg-yellow-400/10 text-yellow-100";

  return (
    <span
      className={`rounded-full border px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em] ${className}`}
    >
      {status}
    </span>
  );
}

const adminInputClass =
  "h-12 w-full min-w-0 rounded-2xl border border-cyan-200/16 bg-[#061632]/85 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-200/45";

const adminPrimaryButtonClass =
  "min-h-12 rounded-full border border-cyan-200/24 bg-cyan-300/14 px-5 text-xs font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_14px_34px_rgba(83,215,255,0.08)] transition hover:scale-[1.01] hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-45";
