"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type AssignableRole =
  | "regular"
  | "student"
  | "teacher"
  | "curriculum_lead";

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

type RoleFilter = "all" | AssignableRole | "admin";

const ROLE_OPTIONS: Array<{
  value: AssignableRole;
  label: string;
  description: string;
}> = [
  {
    value: "regular",
    label: "Regular",
    description: "Standard account without student or teaching privileges.",
  },
  {
    value: "student",
    label: "Student",
    description: "Student learning access and eligible mission rewards.",
  },
  {
    value: "teacher",
    label: "Teacher",
    description: "Teaching Dashboard access for assigned students.",
  },
  {
    value: "curriculum_lead",
    label: "Curriculum Lead",
    description:
      "Teacher-level access plus permission to create and edit Science curriculum questions.",
  },
];

function normaliseRole(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

function canonicalRole(value: string | null | undefined): AssignableRole | "admin" {
  const role = normaliseRole(value);

  if (role === "admin") return "admin";
  if (role === "student") return "student";
  if (role === "teacher") return "teacher";
  if (role === "curriculum-lead") return "curriculum_lead";
  return "regular";
}

function roleLabel(value: string | null | undefined) {
  switch (canonicalRole(value)) {
    case "admin":
      return "Admin";
    case "student":
      return "Student";
    case "teacher":
      return "Teacher";
    case "curriculum_lead":
      return "Curriculum Lead";
    default:
      return "Regular";
  }
}

export default function RoleManagementPanel() {
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [pendingRoles, setPendingRoles] = useState<
    Record<string, AssignableRole>
  >({});
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void loadDirectory();
  }, []);

  async function loadDirectory() {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "admin_get_teacher_assignment_directory",
    );

    if (error) {
      setDirectory([]);
      setErrorMessage(error.message || "Could not load the user directory.");
      setIsLoading(false);
      return;
    }

    const rows = ((data ?? []) as DirectoryRpcRow[]).map((row) => ({
      user_id: String(row.user_id),
      email: row.email ? String(row.email) : null,
      display_name: String(row.display_name || "User"),
      user_role: String(row.user_role || "regular"),
      teacher_type: row.teacher_type ? String(row.teacher_type) : null,
      organization_name: row.organization_name
        ? String(row.organization_name)
        : null,
      teacher_license_status: row.teacher_license_status
        ? String(row.teacher_license_status)
        : null,
      assigned_student_count: Number(row.assigned_student_count || 0),
    }));

    setDirectory(rows);
    setPendingRoles(
      rows.reduce<Record<string, AssignableRole>>((result, user) => {
        const role = canonicalRole(user.user_role);
        if (role !== "admin") result[user.user_id] = role;
        return result;
      }, {}),
    );
    setIsLoading(false);
  }

  const roleCounts = useMemo(() => {
    return directory.reduce(
      (counts, user) => {
        counts[canonicalRole(user.user_role)] += 1;
        return counts;
      },
      {
        regular: 0,
        student: 0,
        teacher: 0,
        curriculum_lead: 0,
        admin: 0,
      } as Record<AssignableRole | "admin", number>,
    );
  }, [directory]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return directory.filter((user) => {
      const role = canonicalRole(user.user_role);
      const matchesRole = roleFilter === "all" || role === roleFilter;
      if (!matchesRole) return false;

      if (!term) return true;

      return (
        user.display_name.toLowerCase().includes(term) ||
        String(user.email || "").toLowerCase().includes(term) ||
        roleLabel(user.user_role).toLowerCase().includes(term) ||
        String(user.organization_name || "").toLowerCase().includes(term)
      );
    });
  }, [directory, roleFilter, search]);

  async function saveRole(user: DirectoryUser) {
    const currentRole = canonicalRole(user.user_role);
    if (currentRole === "admin") return;

    const nextRole = pendingRoles[user.user_id] || "regular";
    if (currentRole === nextRole) {
      setMessage(`${user.display_name} already has the ${roleLabel(nextRole)} role.`);
      setErrorMessage("");
      return;
    }

    setSavingUserId(user.user_id);
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase.rpc("admin_set_user_role", {
      p_user_id: user.user_id,
      p_role: nextRole,
    });

    if (error) {
      setErrorMessage(error.message || "The role could not be updated.");
      setSavingUserId(null);
      return;
    }

    const updatedRow = Array.isArray(data) ? data[0] : data;
    const savedRole = String(updatedRow?.role || nextRole);

    setDirectory((current) =>
      current.map((item) =>
        item.user_id === user.user_id
          ? {
              ...item,
              user_role: savedRole,
              teacher_type:
                updatedRow?.teacher_type ?? item.teacher_type ?? null,
              organization_name:
                updatedRow?.organization_name ?? item.organization_name ?? null,
              teacher_license_status:
                updatedRow?.teacher_license_status ??
                item.teacher_license_status ??
                null,
              assigned_student_count:
                nextRole === "teacher" || nextRole === "curriculum_lead"
                  ? item.assigned_student_count
                  : 0,
            }
          : item,
      ),
    );

    window.dispatchEvent(
      new CustomEvent("dream-admin-role-updated", {
        detail: { userId: user.user_id, role: savedRole },
      }),
    );

    setMessage(
      `${user.display_name} is now ${roleLabel(savedRole)}.`,
    );
    setSavingUserId(null);
  }

  return (
    <section className="mt-8">
      <div className="rounded-[32px] border border-cyan-200/16 bg-white/[0.045] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[0.24em] text-[#8dfcff]">
              Access Control
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-white sm:text-4xl">
              User Roles
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/58">
              Assign Regular, Student, Teacher, or Curriculum Lead access. Admin
              accounts are shown for reference but remain protected.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadDirectory()}
            disabled={isLoading}
            className="min-h-12 rounded-2xl border border-cyan-200/24 bg-cyan-300/[0.08] px-5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#bdf6ff] transition hover:border-cyan-200/45 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Refresh Users"}
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {(
            [
              ["Regular", roleCounts.regular],
              ["Student", roleCounts.student],
              ["Teacher", roleCounts.teacher],
              ["Curriculum Lead", roleCounts.curriculum_lead],
              ["Admin", roleCounts.admin],
            ] as const
          ).map(([label, count]) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4"
            >
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/40">
                {label}
              </p>
              <p className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-white">
                {count.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <label className="grid gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/42">
              Search users
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, role, or organisation"
              className="min-h-12 rounded-2xl border border-cyan-200/16 bg-[#04142d]/80 px-4 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-cyan-200/45"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/42">
              Filter role
            </span>
            <select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value as RoleFilter)
              }
              className="min-h-12 rounded-2xl border border-cyan-200/16 bg-[#04142d] px-4 text-sm text-white outline-none focus:border-cyan-200/45"
            >
              <option value="all">All roles</option>
              <option value="regular">Regular</option>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="curriculum_lead">Curriculum Lead</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        </div>

        {message && (
          <p className="mt-5 rounded-2xl border border-emerald-200/20 bg-emerald-300/[0.08] px-4 py-3 text-sm text-emerald-100">
            {message}
          </p>
        )}

        {errorMessage && (
          <p className="mt-5 rounded-2xl border border-red-200/20 bg-red-400/[0.09] px-4 py-3 text-sm text-red-100">
            {errorMessage}
          </p>
        )}

        <div className="mt-6 grid gap-3">
          {isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-8 text-center text-sm text-white/50">
              Loading user roles...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-8 text-center text-sm text-white/50">
              No users match the current search and filter.
            </div>
          ) : (
            filteredUsers.map((user) => {
              const currentRole = canonicalRole(user.user_role);
              const isAdmin = currentRole === "admin";
              const pendingRole = isAdmin
                ? null
                : pendingRoles[user.user_id] || "regular";
              const hasChanges = !isAdmin && pendingRole !== currentRole;
              const isSaving = savingUserId === user.user_id;

              return (
                <article
                  key={user.user_id}
                  className="rounded-2xl border border-cyan-200/12 bg-[#061632]/72 p-4 sm:p-5"
                >
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px_150px] xl:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-base font-bold text-white">
                          {user.display_name}
                        </h3>
                        <span className="rounded-full border border-cyan-200/16 bg-cyan-300/[0.07] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#bdf6ff]">
                          {roleLabel(user.user_role)}
                        </span>
                        {isAdmin && (
                          <span className="rounded-full border border-violet-200/20 bg-violet-400/12 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-violet-100">
                            Protected
                          </span>
                        )}
                      </div>

                      <p className="mt-2 break-all text-sm text-white/58">
                        {user.email || "No email address"}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/42">
                        {(currentRole === "teacher" ||
                          currentRole === "curriculum_lead") && (
                          <>
                            <span>
                              Licence: {user.teacher_license_status || "inactive"}
                            </span>
                            <span>·</span>
                            <span>
                              Assigned students: {user.assigned_student_count}
                            </span>
                          </>
                        )}
                        {user.organization_name && (
                          <>
                            <span>·</span>
                            <span>{user.organization_name}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <label className="grid gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/42">
                        Assigned role
                      </span>
                      <select
                        value={isAdmin ? "admin" : pendingRole || "regular"}
                        disabled={isAdmin || isSaving}
                        onChange={(event) =>
                          setPendingRoles((current) => ({
                            ...current,
                            [user.user_id]: event.target.value as AssignableRole,
                          }))
                        }
                        className="min-h-12 rounded-2xl border border-cyan-200/16 bg-[#04142d] px-4 text-sm text-white outline-none focus:border-cyan-200/45 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {isAdmin && <option value="admin">Admin</option>}
                        {!isAdmin &&
                          ROLE_OPTIONS.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                      </select>

                      {!isAdmin && pendingRole && (
                        <span className="text-[11px] leading-5 text-white/42">
                          {
                            ROLE_OPTIONS.find(
                              (role) => role.value === pendingRole,
                            )?.description
                          }
                        </span>
                      )}
                    </label>

                    <button
                      type="button"
                      disabled={isAdmin || !hasChanges || isSaving}
                      onClick={() => void saveRole(user)}
                      className="min-h-12 rounded-2xl border border-cyan-200/30 bg-gradient-to-br from-cyan-400/24 to-blue-500/22 px-5 text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:border-cyan-100/55 disabled:cursor-not-allowed disabled:opacity-38"
                    >
                      {isSaving ? "Saving..." : hasChanges ? "Save Role" : "Saved"}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
