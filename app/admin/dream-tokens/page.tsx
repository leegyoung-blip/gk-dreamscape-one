"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type AdminUser = {
  id: string;
  email: string | null;
  role: string;
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

  const filteredUsers = useMemo(() => {
    const searchTerm = search.toLowerCase().trim();

    if (!searchTerm) return users;

    return users.filter((user) =>
      user.email?.toLowerCase().includes(searchTerm)
    );
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
    async function loadStudents() {
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
        .select("id, email, role, created_at")
        .neq("role", "admin")
        .order("created_at", { ascending: false });

      if (profilesError) {
        setMessage(`Unable to load students: ${profilesError.message}`);
        setIsLoading(false);
        return;
      }

      const studentIds = (profiles || []).map((profile) => profile.id);

      let tokenRows: {
        user_id: string;
        amount: number;
      }[] = [];

      if (studentIds.length > 0) {
        const { data: transactions, error: tokenError } = await supabase
          .from("dream_token_transactions")
          .select("user_id, amount")
          .eq("token_kind", "virtual")
          .in("user_id", studentIds);

        if (tokenError) {
          setMessage(`Unable to load token balances: ${tokenError.message}`);
          setIsLoading(false);
          return;
        }

        tokenRows = transactions || [];
      }

      const studentsWithBalances = (profiles || []).map((profile) => {
        const dreamTokenBalance = tokenRows
          .filter((transaction) => transaction.user_id === profile.id)
          .reduce(
            (total, transaction) => total + Number(transaction.amount),
            0
          );

        return {
          id: profile.id,
          email: profile.email,
          role: profile.role || "student",
          created_at: profile.created_at,
          dreamTokenBalance,
        };
      });

      setUsers(studentsWithBalances);
      setIsLoading(false);
    }

    loadStudents();
  }, [router]);

  async function submitReward() {
    setMessage("");

    if (!selectedUserId) {
      setMessage("Please select a student first.");
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

    setMessage("Dream Tokens updated successfully!");
    setIsSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-white px-8 py-10 text-indigo-950">
      <button
        onClick={() => router.push("/profile")}
        className="rounded-full bg-indigo-950 px-5 py-3 text-sm tracking-wide text-white"
      >
        ← Back to Profile
      </button>

      <div className="mx-auto mt-10 max-w-5xl">
        <p className="text-xs uppercase tracking-[0.3em] text-yellow-700">
          GKP Admin
        </p>

        <h1 className="mt-3 text-5xl font-extralight tracking-[0.12em]">
          Dream Token Admin
        </h1>

        <p className="mt-4 max-w-2xl text-indigo-950/60">
          Add or deduct virtual Dream Tokens from student accounts.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_400px]">
          <section className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-[0_0_40px_rgba(99,102,241,0.12)]">
            <h2 className="text-2xl font-light">Select Student</h2>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by student email..."
              className="mt-5 w-full rounded-2xl border border-indigo-100 px-5 py-4 text-sm outline-none focus:border-indigo-400"
            />

            <div className="mt-5 max-h-[460px] space-y-3 overflow-y-auto pr-2">
              {isLoading ? (
                <p className="text-sm text-indigo-950/50">
                  Loading students...
                </p>
              ) : filteredUsers.length === 0 ? (
                <p className="text-sm text-indigo-950/50">
                  No students found.
                </p>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`w-full rounded-2xl border px-5 py-4 text-left transition ${
                      selectedUserId === user.id
                        ? "border-yellow-400 bg-yellow-50"
                        : "border-indigo-100 bg-indigo-50/40 hover:bg-indigo-50"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium text-indigo-950">
                          {user.email || "No email"}
                        </p>

                        <p className="mt-1 text-xs text-indigo-950/40">
                          Role: {user.role}
                        </p>

                        <p className="mt-1 text-xs text-indigo-950/30">
                          {user.id}
                        </p>
                      </div>

                      <span className="rounded-full bg-yellow-100 px-3 py-2 text-xs font-semibold text-yellow-800">
                        {user.dreamTokenBalance} DT
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-yellow-300/50 bg-yellow-50 p-6 shadow-[0_0_40px_rgba(250,204,21,0.18)]">
            <h2 className="text-2xl font-light">Token Action</h2>

            {selectedUser ? (
              <div className="mt-4 rounded-2xl bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-yellow-700">
                  Selected Student
                </p>

                <p className="mt-1 font-medium text-indigo-950">
                  {selectedUser.email}
                </p>

                <p className="mt-2 text-xs text-indigo-950/50">
                  Current balance: {selectedUser.dreamTokenBalance} DT
                </p>
              </div>
            ) : (
              <p className="mt-4 rounded-2xl bg-white p-4 text-sm text-indigo-950/50">
                Select a student from the list.
              </p>
            )}

            <label className="mt-5 block text-sm font-medium text-indigo-950">
              Action
            </label>

            <select
              value={selectedAction}
              onChange={(event) =>
                setSelectedAction(event.target.value as TokenAction)
              }
              className="mt-2 w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-500"
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
                <label className="mt-5 block text-sm font-medium text-indigo-950">
                  Manual Amount
                </label>

                <input
                  type="number"
                  min="1"
                  value={manualAmount}
                  onChange={(event) =>
                    setManualAmount(Number(event.target.value))
                  }
                  className="mt-2 w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-500"
                />
              </>
            )}

            <div className="mt-5 rounded-2xl bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-700">
                This action will apply
              </p>

              <p className="mt-2 text-sm text-indigo-950/70">
                {
                  tokenActions.find((action) => action.id === selectedAction)
                    ?.description
                }
              </p>

              <div className="mt-4 rounded-2xl bg-yellow-50 p-4">
                <p className="text-xs text-indigo-950/50">Virtual Tokens</p>

                <p
                  className={`mt-1 text-2xl font-semibold ${
                    finalAmount < 0 ? "text-red-500" : "text-green-600"
                  }`}
                >
                  {finalAmount > 0 ? "+" : ""}
                  {finalAmount}
                </p>
              </div>
            </div>

            <button
              onClick={submitReward}
              disabled={isSubmitting || !selectedUserId}
              className="mt-6 w-full rounded-full bg-indigo-950 px-5 py-4 text-sm tracking-[0.12em] text-white transition hover:scale-[1.01] disabled:opacity-50"
            >
              {isSubmitting ? "UPDATING..." : "UPDATE DREAM TOKENS"}
            </button>

            {message && (
              <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-indigo-950/70">
                {message}
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}