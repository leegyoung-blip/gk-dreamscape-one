"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import StudentJoinLinkPanel from "@/components/organisation/StudentJoinLinkPanel";

type OrganisationRow = {
  organisation_id: string;
  organisation_name: string;
  organisation_slug: string;
  organisation_type: string;
  organisation_status: string;
  organisation_role: string;
  contact_email: string | null;
  licence_id: string | null;
  licence_type: string | null;
  package_code: string | null;
  licence_status: string | null;
  student_seat_limit: number | null;
  teacher_seat_limit: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_pilot: boolean;
  student_members: number;
  student_pending: number;
  student_reserved: number;
  staff_members: number;
  staff_pending: number;
  staff_reserved: number;
};

type InviteRow = {
  invite_id: string;
  email: string;
  email_normalized: string;
  intended_role: string;
  invite_status: string;
  claimed_user_id: string | null;
  created_at: string;
  claimed_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
};

type MemberRow = {
  membership_id: string;
  user_id: string;
  email: string | null;
  username: string | null;
  membership_role: string;
  membership_status: string;
  joined_at: string;
};

type ImportResult = {
  input_email: string;
  normalized_email: string;
  result_code: string;
  result_message: string;
  invite_id: string | null;
};

function parseEmails(value: string) {
  return [
    ...new Set(
      value
        .split(/[\n,;]+/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

function labelRole(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function seatLabel(used: number, limit: number | null) {
  return limit === null ? `${used} / Unlimited` : `${used} / ${limit}`;
}

function PortalFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#020813] p-6 text-white">
      Loading organisation portal...
    </main>
  );
}

export default function OrganisationManagePage() {
  return (
    <Suspense fallback={<PortalFallback />}>
      <OrganisationManageContent />
    </Suspense>
  );
}

function OrganisationManageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedOrganisationId = searchParams.get("organisationId");

  const [organisations, setOrganisations] = useState<OrganisationRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState("student");
  const [results, setResults] = useState<ImportResult[]>([]);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selected = useMemo(
    () => organisations.find((item) => item.organisation_id === selectedId) || null,
    [organisations, selectedId],
  );

  async function loadOrganisations() {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data, error } = await supabase.rpc("get_my_manageable_organisations");

    if (error) {
      setOrganisations([]);
      setErrorMessage(error.message || "Organisation access could not be loaded.");
      setLoading(false);
      return;
    }

    const rows = (data || []) as OrganisationRow[];

    if (rows.length === 0) {
      setOrganisations([]);
      setErrorMessage(
        "This account is not an organisation administrator. Ask a Dreamscape admin to assign organisation access.",
      );
      setLoading(false);
      return;
    }

    setOrganisations(rows);

    const nextId =
      requestedOrganisationId &&
      rows.some((row) => row.organisation_id === requestedOrganisationId)
        ? requestedOrganisationId
        : rows[0].organisation_id;

    setSelectedId(nextId);
    setLoading(false);
  }

  async function loadOrganisationData(organisationId: string) {
    setErrorMessage("");

    const [inviteResult, memberResult] = await Promise.all([
      supabase.rpc("get_organisation_invites", {
        p_organisation_id: organisationId,
      }),
      supabase.rpc("get_organisation_members", {
        p_organisation_id: organisationId,
      }),
    ]);

    if (inviteResult.error) {
      setInvites([]);
      setErrorMessage(inviteResult.error.message);
    } else {
      setInvites((inviteResult.data || []) as InviteRow[]);
    }

    if (memberResult.error) {
      setMembers([]);
      setErrorMessage((current) =>
        current
          ? `${current} ${memberResult.error?.message || ""}`
          : memberResult.error?.message || "",
      );
    } else {
      setMembers((memberResult.data || []) as MemberRow[]);
    }
  }

  useEffect(() => {
    void loadOrganisations();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    void loadOrganisationData(selectedId);
  }, [selectedId]);

  async function refreshAll() {
    const { data } = await supabase.rpc("get_my_manageable_organisations");
    if (data) setOrganisations(data as OrganisationRow[]);
    if (selectedId) await loadOrganisationData(selectedId);
  }

  async function importEmails() {
    if (!selected) return;

    const parsed = parseEmails(emails);

    if (parsed.length === 0) {
      setErrorMessage("Paste at least one email address.");
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");
    setResults([]);

    const { data, error } = await supabase.rpc("add_organisation_invites", {
      p_organisation_id: selected.organisation_id,
      p_emails: parsed,
      p_intended_role: role,
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message || "Emails could not be added.");
      return;
    }

    const rows = (data || []) as ImportResult[];
    setResults(rows);

    const accepted = rows.filter((row) => row.result_code === "accepted").length;
    setMessage(
      `${accepted} of ${rows.length} email${rows.length === 1 ? "" : "s"} accepted. Pending emails reserve licence seats immediately.`,
    );

    if (accepted > 0) setEmails("");
    await refreshAll();
  }

  async function revokeInvite(inviteId: string) {
    const confirmed = window.confirm(
      "Revoke this pending email? Its reserved licence seat will be released.",
    );
    if (!confirmed) return;

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("revoke_organisation_invite", {
      p_invite_id: inviteId,
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message || "Invitation could not be revoked.");
      return;
    }

    setMessage("Pending invitation revoked and its reserved seat released.");
    await refreshAll();
  }

  async function removeOrganisationMember(member: MemberRow) {
    if (!selected || selected.organisation_role !== "dreamscape_admin") return;

    const displayName =
      member.email || member.username || "this Dreamscape account";

    const confirmed = window.confirm(
      `Remove ${displayName} from ${selected.organisation_name}?\n\n` +
        "This releases the claimed licence seat immediately and removes any active class assignments in this organisation. " +
        "The Dreamscape account, quiz history, DT, DG and other personal account data are NOT deleted.\n\n" +
        "A removed student cannot simply reuse the shared Student Join Link. To intentionally admit them again later, add their exact email through the Approved Email List.",
    );

    if (!confirmed) return;

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "admin_remove_organisation_member",
      {
        p_membership_id: member.membership_id,
      },
    );

    setSaving(false);

    if (error) {
      setErrorMessage(
        error.message || "The organisation member could not be removed.",
      );
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    const classAssignmentsRemoved = Number(
      row?.class_assignments_removed || 0,
    );

    setMessage(
      `${displayName} was removed from ${selected.organisation_name}. ` +
        `The claimed ${labelRole(member.membership_role)} seat was released` +
        (classAssignmentsRemoved > 0
          ? ` and ${classAssignmentsRemoved} active class assignment${
              classAssignmentsRemoved === 1 ? "" : "s"
            } were removed.`
          : "."),
    );

    await refreshAll();
  }

  const pendingInvites = invites.filter(
    (invite) => invite.invite_status === "pending",
  );
  const activeMembers = members.filter(
    (member) => member.membership_status === "active",
  );
  const inactiveMembers = members.filter(
    (member) => member.membership_status !== "active",
  );
  const isDreamscapeAdmin =
    selected?.organisation_role === "dreamscape_admin";

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#020813] px-5 py-8 text-white sm:px-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(126,232,255,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.14),transparent_34%),linear-gradient(180deg,#041124_0%,#020813_100%)]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="w-fit rounded-full border border-cyan-200/25 bg-white/[0.08] px-5 py-3 text-sm text-white backdrop-blur-xl"
          >
            ← Back to Profile
          </button>

          <div className="flex flex-wrap gap-3">
            {!loading && selectedId && (
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/organisation/class-matching?organisationId=${selectedId}`,
                  )
                }
                className="w-fit rounded-full border border-violet-200/24 bg-violet-300/10 px-5 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-violet-100"
              >
                Class Matching
              </button>
            )}

            {!loading && organisations.some((organisation) => organisation.organisation_role !== "dreamscape_admin") && (
              <button
                type="button"
                onClick={() => router.push("/teacher-dashboard")}
                className="w-fit rounded-full border border-emerald-200/24 bg-emerald-300/10 px-5 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-emerald-100"
              >
                Teacher Dashboard & Classes
              </button>
            )}

            <button
              type="button"
              onClick={() => void refreshAll()}
              className="w-fit rounded-full border border-cyan-200/22 bg-cyan-300/10 px-5 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-[#8dfcff]"
            >
              Refresh
            </button>
          </div>
        </div>

        <header className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8dfcff]">
            Dreamscape Education Licensing
          </p>
          <h1 className="mt-4 text-5xl font-extralight tracking-[-0.05em] sm:text-7xl">
            Organisation Portal
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-white/60">
            Manage student onboarding, approved account emails and the organisation
            roster covered by your Dreamscape licence. Students can join through a
            centre-shared link or through an approved email reservation. Formal classes
            are created and managed from the Teacher Dashboard.
          </p>
        </header>

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

        {loading ? (
          <p className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-white/50">
            Loading organisation access...
          </p>
        ) : organisations.length > 0 ? (
          <>
            {organisations.length > 1 && (
              <label className="mt-8 block max-w-xl">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-white/42">
                  Organisation
                </span>
                <select
                  value={selectedId}
                  onChange={(event) => {
                    setSelectedId(event.target.value);
                    setResults([]);
                    setMessage("");
                    setErrorMessage("");
                  }}
                  className="min-h-12 w-full rounded-2xl border border-cyan-200/16 bg-[#061632] px-4 text-sm text-white outline-none"
                >
                  {organisations.map((organisation) => (
                    <option
                      key={organisation.organisation_id}
                      value={organisation.organisation_id}
                    >
                      {organisation.organisation_name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {selected && (
              <>
                <section className="mt-8 rounded-[32px] border border-cyan-200/18 bg-white/[0.045] p-6 backdrop-blur-xl sm:p-7">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8dfcff]">
                        {selected.organisation_role === "dreamscape_admin"
                          ? "Dreamscape Admin View"
                          : "Organisation Administrator"}
                      </p>
                      <h2 className="mt-2 text-4xl font-bold tracking-[-0.04em]">
                        {selected.organisation_name}
                      </h2>
                      <p className="mt-2 text-sm text-white/46">
                        {selected.licence_type || "No licence"} ·{" "}
                        {selected.licence_status || "No status"}
                      </p>
                    </div>

                    <div className="grid min-w-[280px] grid-cols-2 gap-3">
                      <SeatCard
                        label="Student seats"
                        value={seatLabel(
                          selected.student_reserved,
                          selected.student_seat_limit,
                        )}
                        detail={`${selected.student_members} claimed · ${selected.student_pending} pending`}
                      />
                      <SeatCard
                        label="Staff seats"
                        value={seatLabel(
                          selected.staff_reserved,
                          selected.teacher_seat_limit,
                        )}
                        detail={`${selected.staff_members} claimed · ${selected.staff_pending} pending`}
                      />
                    </div>
                  </div>
                </section>

                <StudentJoinLinkPanel
                  key={selected.organisation_id}
                  organisationId={selected.organisation_id}
                  organisationName={selected.organisation_name}
                />

                <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
                  <section className="rounded-[32px] border border-cyan-200/18 bg-white/[0.045] p-6 backdrop-blur-xl sm:p-7">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8dfcff]">
                      Approved Email List
                    </p>
                    <h2 className="mt-2 text-3xl font-bold">Reserve licence seats</h2>
                    <p className="mt-3 text-sm leading-6 text-white/50">
                      Paste emails separated by new lines, commas or semicolons. Pending
                      emails reserve seats immediately so the licence cannot be overbooked.
                    </p>

                    <label className="mt-5 block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-white/42">
                        Account type
                      </span>
                      <select
                        value={role}
                        onChange={(event) => setRole(event.target.value)}
                        className="min-h-12 w-full rounded-2xl border border-cyan-200/16 bg-[#061632] px-4 text-sm text-white outline-none"
                      >
                        <option value="student">Students</option>
                        <option value="teacher">Teachers</option>
                        <option value="curriculum_lead">Curriculum Leads</option>
                        {selected.organisation_role === "dreamscape_admin" && (
                          <option value="organisation_admin">
                            Organisation Administrators
                          </option>
                        )}
                      </select>
                    </label>

                    <textarea
                      value={emails}
                      onChange={(event) => setEmails(event.target.value)}
                      rows={11}
                      placeholder={`student1@example.com\nstudent2@example.com\nstudent3@example.com`}
                      className="mt-4 w-full resize-y rounded-3xl border border-cyan-200/16 bg-[#061632]/85 px-5 py-4 text-sm leading-7 text-white outline-none placeholder:text-white/26 focus:border-cyan-200/45"
                    />

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-white/42">
                        {parseEmails(emails).length} unique email
                        {parseEmails(emails).length === 1 ? "" : "s"} ready
                      </span>
                      <button
                        type="button"
                        disabled={saving || parseEmails(emails).length === 0}
                        onClick={() => void importEmails()}
                        className="min-h-12 rounded-full border border-cyan-200/28 bg-cyan-300/14 px-6 text-xs font-extrabold uppercase tracking-[0.12em] text-white disabled:opacity-45"
                      >
                        {saving ? "Saving..." : "Validate & Add Emails"}
                      </button>
                    </div>

                    {results.length > 0 && (
                      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                        {results.map((result, index) => (
                          <div
                            key={`${result.normalized_email}-${index}`}
                            className="flex flex-col gap-2 border-b border-white/8 bg-white/[0.025] px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <span className="break-all text-sm text-white/78">
                              {result.input_email}
                            </span>
                            <span
                              className={`text-xs font-bold ${
                                result.result_code === "accepted"
                                  ? "text-green-200"
                                  : result.result_code.includes("seat_limit")
                                    ? "text-amber-200"
                                    : "text-red-200"
                              }`}
                            >
                              {result.result_message}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <aside className="space-y-6">
                    <section className="rounded-[32px] border border-violet-200/18 bg-violet-400/[0.055] p-6 backdrop-blur-xl">
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-200">
                            Pending
                          </p>
                          <h3 className="mt-2 text-2xl font-bold">Reserved emails</h3>
                        </div>
                        <strong className="text-3xl text-violet-200">
                          {pendingInvites.length}
                        </strong>
                      </div>

                      <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1">
                        {pendingInvites.length === 0 ? (
                          <p className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-white/42">
                            No pending emails.
                          </p>
                        ) : (
                          pendingInvites.map((invite) => (
                            <div
                              key={invite.invite_id}
                              className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
                            >
                              <p className="break-all text-sm font-semibold text-white">
                                {invite.email}
                              </p>
                              <div className="mt-2 flex items-center justify-between gap-3">
                                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-violet-200">
                                  {labelRole(invite.intended_role)}
                                </span>
                                <button
                                  type="button"
                                  disabled={saving}
                                  onClick={() => void revokeInvite(invite.invite_id)}
                                  className="rounded-full border border-red-200/18 bg-red-400/10 px-3 py-1 text-[10px] font-bold uppercase text-red-100"
                                >
                                  Revoke
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  </aside>
                </div>

                <section className="mt-6 rounded-[32px] border border-emerald-200/16 bg-emerald-400/[0.04] p-6 backdrop-blur-xl sm:p-7">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">
                        Claimed accounts
                      </p>
                      <h2 className="mt-2 text-3xl font-bold">
                        Active organisation members
                      </h2>
                      {isDreamscapeAdmin && (
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/46">
                          Dreamscape admins can release a claimed seat if an account
                          was connected by mistake. Removing a member does not delete
                          their Dreamscape account or learning history.
                        </p>
                      )}
                    </div>
                    <strong className="text-3xl text-emerald-200">
                      {activeMembers.length}
                    </strong>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {activeMembers.length === 0 ? (
                      <p className="text-sm text-white/42">
                        No active claimed accounts yet. A student who successfully
                        joins through the shared link, or a matching approved email
                        that is claimed, will appear here.
                      </p>
                    ) : (
                      activeMembers.map((member) => (
                        <article
                          key={member.membership_id}
                          className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
                        >
                          <strong className="block break-all text-sm text-white">
                            {member.email || member.username || "Dreamscape account"}
                          </strong>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-200">
                                {labelRole(member.membership_role)}
                              </span>
                              <span className="mt-1 block text-[10px] uppercase tracking-[0.08em] text-white/34">
                                {member.membership_status}
                              </span>
                            </div>

                            {isDreamscapeAdmin && (
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() =>
                                  void removeOrganisationMember(member)
                                }
                                className="rounded-full border border-red-200/24 bg-red-400/10 px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.1em] text-red-100 transition hover:bg-red-400/18 disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                Remove Seat
                              </button>
                            )}
                          </div>
                        </article>
                      ))
                    )}
                  </div>

                  {isDreamscapeAdmin && inactiveMembers.length > 0 && (
                    <div className="mt-7 border-t border-white/10 pt-6">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/34">
                            Removed / inactive
                          </p>
                          <p className="mt-2 text-sm leading-6 text-white/42">
                            These records do not consume licence seats. To deliberately
                            admit one again, add that account&apos;s exact email through
                            the Approved Email List above.
                          </p>
                        </div>
                        <strong className="text-xl text-white/42">
                          {inactiveMembers.length}
                        </strong>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {inactiveMembers.map((member) => (
                          <article
                            key={member.membership_id}
                            className="rounded-2xl border border-white/8 bg-black/15 p-4 opacity-75"
                          >
                            <strong className="block break-all text-sm text-white/72">
                              {member.email ||
                                member.username ||
                                "Dreamscape account"}
                            </strong>
                            <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.1em] text-white/40">
                              {labelRole(member.membership_role)}
                            </span>
                            <span className="mt-1 block text-[10px] uppercase tracking-[0.08em] text-red-200/70">
                              {member.membership_status}
                            </span>
                          </article>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}

function SeatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
        {label}
      </p>
      <strong className="mt-2 block text-xl text-white">{value}</strong>
      <span className="mt-1 block text-[10px] text-white/36">{detail}</span>
    </div>
  );
}
