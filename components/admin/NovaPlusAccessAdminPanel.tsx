"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

type NovaPlusUser = {
  user_id: string;
  email: string | null;
  display_name: string;
  primary_role: string;
  has_nova_plus: boolean;
  granted_at: string | null;
};

function formatRole(role: string) {
  return String(role || "regular")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (match) =>
      match.toUpperCase(),
    );
}

export default function NovaPlusAccessAdminPanel() {
  const [users, setUsers] =
    useState<NovaPlusUser[]>([]);
  const [search, setSearch] =
    useState("");
  const [loading, setLoading] =
    useState(true);
  const [savingId, setSavingId] =
    useState("");
  const [error, setError] =
    useState("");
  const [message, setMessage] =
    useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error: rpcError } =
        await supabase.rpc(
          "admin_list_nova_plus_access",
        );

      if (rpcError) throw rpcError;

      setUsers(
        (data ?? []) as NovaPlusUser[],
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : String(loadError),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const term =
      search.trim().toLowerCase();

    if (!term) return users;

    return users.filter((user) => {
      return [
        user.display_name,
        user.email,
        user.primary_role,
        user.has_nova_plus
          ? "nova+"
          : "",
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(term),
        );
    });
  }, [search, users]);

  const activeCount =
    users.filter(
      (user) => user.has_nova_plus,
    ).length;

  async function setNovaPlus(
    user: NovaPlusUser,
    enabled: boolean,
  ) {
    setSavingId(user.user_id);
    setError("");
    setMessage("");

    try {
      const { error: rpcError } =
        await supabase.rpc(
          "admin_set_user_nova_plus_role",
          {
            p_user_id: user.user_id,
            p_enabled: enabled,
          },
        );

      if (rpcError) throw rpcError;

      setUsers((current) =>
        current.map((row) =>
          row.user_id === user.user_id
            ? {
                ...row,
                has_nova_plus: enabled,
                granted_at: enabled
                  ? new Date().toISOString()
                  : null,
              }
            : row,
        ),
      );

      setMessage(
        `${user.display_name} ${
          enabled
            ? "now has"
            : "no longer has"
        } NOVA+ access.`,
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : String(saveError),
      );
    } finally {
      setSavingId("");
    }
  }

  return (
    <section className="mt-8 grid gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="NOVA+ Accounts"
          value={
            loading
              ? "..."
              : activeCount.toLocaleString()
          }
        />
        <Metric
          label="All Accounts"
          value={
            loading
              ? "..."
              : users.length.toLocaleString()
          }
        />
        <Metric
          label="Access Model"
          value="Additive"
        />
      </div>

      <section className="rounded-[32px] border border-violet-200/18 bg-[linear-gradient(145deg,rgba(88,48,160,.12),rgba(4,20,48,.86))] p-6 shadow-[0_24px_70px_rgba(0,0,0,.26)] backdrop-blur-xl sm:p-7">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-[#cbb2ff]">
          NOVA+ ACCESS
        </p>

        <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white">
          Additional account role
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/52">
          NOVA+ is additive. A learner remains a Student and a
          teacher remains a Teacher; this switch grants the extra
          NOVA+ capability without replacing their primary role.
        </p>

        {message && (
          <p className="mt-5 rounded-2xl border border-green-200/20 bg-green-400/10 px-5 py-4 text-sm text-green-100">
            {message}
          </p>
        )}

        {error && (
          <p className="mt-5 rounded-2xl border border-red-200/20 bg-red-400/10 px-5 py-4 text-sm text-red-100">
            {error}
          </p>
        )}

        <input
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search name, email, role or NOVA+"
          className="mt-6 min-h-12 w-full rounded-2xl border border-cyan-200/14 bg-[#061632] px-4 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-cyan-200/45"
        />
      </section>

      <section className="overflow-hidden rounded-[32px] border border-cyan-200/14 bg-white/[0.035]">
        <div className="grid grid-cols-[minmax(0,1fr)_150px_150px] gap-4 border-b border-white/8 px-5 py-4 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white/34">
          <span>Account</span>
          <span>Primary role</span>
          <span>NOVA+</span>
        </div>

        {loading ? (
          <p className="px-5 py-8 text-sm text-white/42">
            Loading accounts...
          </p>
        ) : visible.length === 0 ? (
          <p className="px-5 py-8 text-sm text-white/42">
            No matching accounts.
          </p>
        ) : (
          visible.map((user) => (
            <article
              key={user.user_id}
              className="grid grid-cols-[minmax(0,1fr)_150px_150px] items-center gap-4 border-b border-white/6 px-5 py-4 last:border-b-0"
            >
              <div className="min-w-0">
                <strong className="block truncate text-sm text-white">
                  {user.display_name}
                </strong>
                <small className="mt-1 block truncate text-[11px] text-white/35">
                  {user.email || "No email"}
                </small>
              </div>

              <span className="w-fit rounded-full border border-cyan-200/12 bg-cyan-300/[0.06] px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#8dfcff]">
                {formatRole(
                  user.primary_role,
                )}
              </span>

              <button
                type="button"
                disabled={
                  savingId === user.user_id
                }
                onClick={() =>
                  void setNovaPlus(
                    user,
                    !user.has_nova_plus,
                  )
                }
                className={`min-h-10 rounded-full border px-4 text-[11px] font-extrabold uppercase tracking-[0.1em] transition disabled:opacity-45 ${
                  user.has_nova_plus
                    ? "border-violet-200/32 bg-violet-300/12 text-violet-100"
                    : "border-white/10 bg-white/[0.025] text-white/42 hover:border-violet-200/24 hover:text-white"
                }`}
              >
                {savingId === user.user_id
                  ? "Saving..."
                  : user.has_nova_plus
                    ? "NOVA+ Active"
                    : "Grant NOVA+"}
              </button>
            </article>
          ))
        )}
      </section>
    </section>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-3xl border border-cyan-200/12 bg-white/[0.04] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-white/38">
        {label}
      </p>
      <strong className="mt-3 block text-3xl tracking-[-0.04em] text-white">
        {value}
      </strong>
    </article>
  );
}
