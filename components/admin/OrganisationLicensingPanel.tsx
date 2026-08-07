"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

const inputClass =
  "min-h-12 w-full rounded-2xl border border-cyan-200/16 bg-[#061632]/90 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-200/45";

function nullablePositiveInteger(value: string) {
  const clean = value.trim();
  if (!clean) return null;
  const parsed = Number(clean);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}

function labelForType(value: string | null) {
  return String(value || "other")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function seatLabel(used: number, limit: number | null) {
  return limit === null ? `${used} / Unlimited` : `${used} / ${limit}`;
}

export default function OrganisationLicensingPanel() {
  const router = useRouter();

  const [organisations, setOrganisations] = useState<OrganisationRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [organisationType, setOrganisationType] = useState("tuition_centre");
  const [contactEmail, setContactEmail] = useState("");
  const [licenceType, setLicenceType] = useState("pilot");
  const [packageCode, setPackageCode] = useState("");
  const [studentSeats, setStudentSeats] = useState("5");
  const [teacherSeats, setTeacherSeats] = useState("1");
  const [startsAt, setStartsAt] = useState(new Date().toISOString().slice(0, 10));
  const [endsAt, setEndsAt] = useState("");
  const [isPilot, setIsPilot] = useState(true);
  const [managerEmail, setManagerEmail] = useState("");

  const [editName, setEditName] = useState("");
  const [editOrganisationType, setEditOrganisationType] =
    useState("tuition_centre");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editOrganisationStatus, setEditOrganisationStatus] = useState("active");

  const [editLicenceType, setEditLicenceType] = useState("pilot");
  const [editPackageCode, setEditPackageCode] = useState("");
  const [editLicenceStatus, setEditLicenceStatus] = useState("active");
  const [editStudentSeats, setEditStudentSeats] = useState("");
  const [editTeacherSeats, setEditTeacherSeats] = useState("");
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");
  const [editIsPilot, setEditIsPilot] = useState(false);
  const [additionalManagerEmail, setAdditionalManagerEmail] = useState("");

  const selected = useMemo(
    () => organisations.find((item) => item.organisation_id === selectedId) || null,
    [organisations, selectedId],
  );

  async function loadOrganisations(preferredId?: string) {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.rpc("get_my_manageable_organisations");

    if (error) {
      setOrganisations([]);
      setErrorMessage(error.message || "Could not load organisations.");
      setLoading(false);
      return;
    }

    const rows = (data || []) as OrganisationRow[];
    setOrganisations(rows);

    const nextId =
      preferredId && rows.some((row) => row.organisation_id === preferredId)
        ? preferredId
        : selectedId && rows.some((row) => row.organisation_id === selectedId)
          ? selectedId
          : rows[0]?.organisation_id || "";

    setSelectedId(nextId);
    setLoading(false);
  }

  useEffect(() => {
    void loadOrganisations();
  }, []);

  useEffect(() => {
    if (!selected) return;

    setEditName(selected.organisation_name);
    setEditOrganisationType(selected.organisation_type);
    setEditContactEmail(selected.contact_email || "");
    setEditOrganisationStatus(selected.organisation_status);

    setEditLicenceType(selected.licence_type || "pilot");
    setEditPackageCode(selected.package_code || "");
    setEditLicenceStatus(selected.licence_status || "active");
    setEditStudentSeats(
      selected.student_seat_limit === null ? "" : String(selected.student_seat_limit),
    );
    setEditTeacherSeats(
      selected.teacher_seat_limit === null ? "" : String(selected.teacher_seat_limit),
    );
    setEditStartsAt(selected.starts_at || new Date().toISOString().slice(0, 10));
    setEditEndsAt(selected.ends_at || "");
    setEditIsPilot(Boolean(selected.is_pilot));
    setAdditionalManagerEmail("");
  }, [selectedId, selected]);

  function autoSlug(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function createOrganisation() {
    setMessage("");
    setErrorMessage("");

    if (!name.trim() || !slug.trim()) {
      setErrorMessage("Organisation name and slug are required.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase.rpc("admin_create_education_organisation", {
      p_name: name.trim(),
      p_organisation_type: organisationType,
      p_slug: slug.trim(),
      p_contact_email: contactEmail.trim() || null,
      p_licence_type: licenceType,
      p_package_code: packageCode.trim() || null,
      p_student_seat_limit: nullablePositiveInteger(studentSeats),
      p_teacher_seat_limit: nullablePositiveInteger(teacherSeats),
      p_starts_at: startsAt,
      p_ends_at: endsAt || null,
      p_is_pilot: isPilot,
      p_manager_email: managerEmail.trim() || null,
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message || "Could not create organisation.");
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;
    const newOrganisationId = String(result?.organisation_id || "");

    setMessage(
      result?.manager_status === "pending_account"
        ? "Organisation created. The manager email is reserved and will link automatically in Phase 1C after account claim."
        : "Organisation and active licence created successfully.",
    );

    setName("");
    setSlug("");
    setContactEmail("");
    setPackageCode("");
    setManagerEmail("");
    setShowCreate(false);

    await loadOrganisations(newOrganisationId);
  }

  async function saveOrganisation() {
    if (!selected) return;

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("admin_update_education_organisation", {
      p_organisation_id: selected.organisation_id,
      p_name: editName.trim(),
      p_organisation_type: editOrganisationType,
      p_contact_email: editContactEmail.trim() || null,
      p_status: editOrganisationStatus,
    });

    if (error) {
      setSaving(false);
      setErrorMessage(error.message || "Could not update organisation.");
      return;
    }

    setMessage("Organisation details saved.");
    await loadOrganisations(selected.organisation_id);
    setSaving(false);
  }

  async function saveLicence() {
    if (!selected?.licence_id) {
      setErrorMessage("No licence exists for this organisation.");
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("admin_update_organisation_licence", {
      p_licence_id: selected.licence_id,
      p_licence_type: editLicenceType,
      p_package_code: editPackageCode.trim() || null,
      p_status: editLicenceStatus,
      p_student_seat_limit: nullablePositiveInteger(editStudentSeats),
      p_teacher_seat_limit: nullablePositiveInteger(editTeacherSeats),
      p_starts_at: editStartsAt,
      p_ends_at: editEndsAt || null,
      p_is_pilot: editIsPilot,
    });

    if (error) {
      setSaving(false);
      setErrorMessage(error.message || "Could not update licence.");
      return;
    }

    setMessage("Licence settings saved.");
    await loadOrganisations(selected.organisation_id);
    setSaving(false);
  }

  async function addManager() {
    if (!selected || !additionalManagerEmail.trim()) return;

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase.rpc("admin_add_organisation_manager", {
      p_organisation_id: selected.organisation_id,
      p_email: additionalManagerEmail.trim(),
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message || "Could not add organisation manager.");
      return;
    }

    const status = String(data || "");
    setMessage(
      status === "pending_account"
        ? "Manager email reserved. It will claim automatically in Phase 1C when that account signs in."
        : "Organisation manager access updated.",
    );
    setAdditionalManagerEmail("");
    await loadOrganisations(selected.organisation_id);
  }

  return (
    <section className="mt-8">
      <div className="flex flex-col gap-4 rounded-[32px] border border-cyan-200/18 bg-white/[0.045] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:p-7 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-[#8dfcff]">
            Phase 1B
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white">
            Organisations & Licensing
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/52">
            Create GKP or external education organisations, control licence seats,
            appoint organisation administrators and open each organisation&apos;s
            approved-email portal.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate((current) => !current)}
          className="min-h-12 rounded-full border border-cyan-200/28 bg-cyan-300/14 px-6 text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-cyan-300/22"
        >
          {showCreate ? "Close Creator" : "+ New Organisation"}
        </button>
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

      {showCreate && (
        <section className="mt-6 rounded-[32px] border border-violet-200/20 bg-violet-400/[0.055] p-6 backdrop-blur-xl sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-200">
            Create Organisation + Initial Licence
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <span className="mb-2 block text-xs text-white/48">Organisation name</span>
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (!slug || slug === autoSlug(name)) {
                    setSlug(autoSlug(event.target.value));
                  }
                }}
                className={inputClass}
                placeholder="Bright Minds Learning"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs text-white/48">Slug</span>
              <input
                value={slug}
                onChange={(event) => setSlug(autoSlug(event.target.value))}
                className={inputClass}
                placeholder="bright-minds-learning"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs text-white/48">Organisation type</span>
              <select
                value={organisationType}
                onChange={(event) => setOrganisationType(event.target.value)}
                className={inputClass}
              >
                <option value="tuition_centre">Tuition Centre</option>
                <option value="school">School</option>
                <option value="independent_tutor">Independent Tutor</option>
                <option value="education_partner">Education Partner</option>
                <option value="gkp">Guru Kids Pro</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs text-white/48">Contact email</span>
              <input
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                className={inputClass}
                placeholder="admin@centre.com"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs text-white/48">Licence type</span>
              <select
                value={licenceType}
                onChange={(event) => {
                  const next = event.target.value;
                  setLicenceType(next);
                  setIsPilot(next === "pilot");
                }}
                className={inputClass}
              >
                <option value="pilot">Pilot</option>
                <option value="annual">Annual</option>
                <option value="custom">Custom</option>
                <option value="internal">Internal</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs text-white/48">Package code</span>
              <input
                value={packageCode}
                onChange={(event) => setPackageCode(event.target.value)}
                className={inputClass}
                placeholder="pilot-20"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs text-white/48">Student seats</span>
              <input
                type="number"
                min="1"
                value={studentSeats}
                onChange={(event) => setStudentSeats(event.target.value)}
                className={inputClass}
                placeholder="Blank = unlimited"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs text-white/48">Teacher/staff seats</span>
              <input
                type="number"
                min="1"
                value={teacherSeats}
                onChange={(event) => setTeacherSeats(event.target.value)}
                className={inputClass}
                placeholder="Blank = unlimited"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs text-white/48">Start date</span>
              <input
                type="date"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs text-white/48">End date</span>
              <input
                type="date"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                className={inputClass}
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs text-white/48">
                First organisation administrator email
              </span>
              <input
                value={managerEmail}
                onChange={(event) => setManagerEmail(event.target.value)}
                className={inputClass}
                placeholder="owner@centre.com"
              />
            </label>
          </div>

          <label className="mt-4 flex w-fit items-center gap-3 rounded-full border border-violet-200/16 bg-violet-300/[0.06] px-4 py-3 text-xs font-bold text-white/72">
            <input
              type="checkbox"
              checked={isPilot}
              onChange={(event) => setIsPilot(event.target.checked)}
              className="h-4 w-4 accent-violet-300"
            />
            Mark as pilot licence
          </label>

          <button
            type="button"
            disabled={saving}
            onClick={() => void createOrganisation()}
            className="mt-5 min-h-12 rounded-full border border-violet-200/28 bg-violet-300/16 px-7 text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-violet-300/24 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Organisation"}
          </button>
        </section>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="h-fit rounded-[32px] border border-cyan-200/18 bg-white/[0.045] p-5 backdrop-blur-xl xl:sticky xl:top-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8dfcff]">
                Licensed organisations
              </p>
              <h3 className="mt-2 text-3xl font-bold">Directory</h3>
            </div>
            <strong className="text-3xl text-[#8dfcff]">{organisations.length}</strong>
          </div>

          <div className="mt-5 space-y-2">
            {loading ? (
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/48">
                Loading organisations...
              </p>
            ) : (
              organisations.map((organisation) => (
                <button
                  key={organisation.organisation_id}
                  type="button"
                  onClick={() => {
                    setSelectedId(organisation.organisation_id);
                    setMessage("");
                    setErrorMessage("");
                  }}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedId === organisation.organisation_id
                      ? "border-cyan-200/42 bg-cyan-300/10"
                      : "border-white/10 bg-white/[0.025] hover:border-cyan-200/22"
                  }`}
                >
                  <strong className="block text-sm text-white">
                    {organisation.organisation_name}
                  </strong>
                  <span className="mt-1 block text-[11px] text-white/42">
                    {labelForType(organisation.organisation_type)}
                  </span>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-cyan-200/16 bg-cyan-300/[0.07] px-2 py-1 text-[9px] font-bold uppercase text-[#8dfcff]">
                      {organisation.licence_type || "No licence"}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-bold uppercase text-white/58">
                      {organisation.organisation_status}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="min-w-0 space-y-6">
          {!selected ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-[32px] border border-cyan-200/18 bg-white/[0.045] p-8 text-center text-white/48">
              Create or select an organisation.
            </div>
          ) : (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric
                  label="Student Seats"
                  value={seatLabel(selected.student_reserved, selected.student_seat_limit)}
                  detail={`${selected.student_members} claimed · ${selected.student_pending} pending`}
                />
                <Metric
                  label="Staff Seats"
                  value={seatLabel(selected.staff_reserved, selected.teacher_seat_limit)}
                  detail={`${selected.staff_members} claimed · ${selected.staff_pending} pending`}
                />
                <Metric
                  label="Licence"
                  value={labelForType(selected.licence_type)}
                  detail={selected.licence_status || "No licence"}
                />
                <Metric
                  label="Organisation"
                  value={labelForType(selected.organisation_type)}
                  detail={selected.organisation_status}
                />
              </section>

              <article className="rounded-[32px] border border-cyan-200/18 bg-white/[0.045] p-6 backdrop-blur-xl sm:p-7">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8dfcff]">
                      Organisation record
                    </p>
                    <h3 className="mt-2 text-3xl font-bold">{selected.organisation_name}</h3>
                    <p className="mt-2 text-sm text-white/44">/{selected.organisation_slug}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/organisation/manage?organisationId=${encodeURIComponent(
                          selected.organisation_id,
                        )}`,
                      )
                    }
                    className="min-h-12 rounded-full border border-emerald-200/28 bg-emerald-300/12 px-6 text-xs font-extrabold uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-300/20"
                  >
                    Manage Emails & Roster →
                  </button>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-xs text-white/48">Name</span>
                    <input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-xs text-white/48">Contact email</span>
                    <input
                      value={editContactEmail}
                      onChange={(event) => setEditContactEmail(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-xs text-white/48">Type</span>
                    <select
                      value={editOrganisationType}
                      onChange={(event) => setEditOrganisationType(event.target.value)}
                      className={inputClass}
                    >
                      <option value="gkp">Guru Kids Pro</option>
                      <option value="tuition_centre">Tuition Centre</option>
                      <option value="school">School</option>
                      <option value="independent_tutor">Independent Tutor</option>
                      <option value="education_partner">Education Partner</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label>
                    <span className="mb-2 block text-xs text-white/48">Status</span>
                    <select
                      value={editOrganisationStatus}
                      onChange={(event) => setEditOrganisationStatus(event.target.value)}
                      className={inputClass}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveOrganisation()}
                  className="mt-5 min-h-12 rounded-full border border-cyan-200/24 bg-cyan-300/14 px-6 text-xs font-extrabold uppercase tracking-[0.12em] text-white"
                >
                  Save Organisation
                </button>
              </article>

              <article className="rounded-[32px] border border-violet-200/20 bg-violet-400/[0.055] p-6 backdrop-blur-xl sm:p-7">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-200">
                  Licence controls
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label>
                    <span className="mb-2 block text-xs text-white/48">Licence type</span>
                    <select
                      value={editLicenceType}
                      onChange={(event) => setEditLicenceType(event.target.value)}
                      className={inputClass}
                    >
                      <option value="internal">Internal</option>
                      <option value="pilot">Pilot</option>
                      <option value="annual">Annual</option>
                      <option value="custom">Custom</option>
                    </select>
                  </label>
                  <label>
                    <span className="mb-2 block text-xs text-white/48">Package code</span>
                    <input
                      value={editPackageCode}
                      onChange={(event) => setEditPackageCode(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-xs text-white/48">Student seats</span>
                    <input
                      type="number"
                      min="1"
                      value={editStudentSeats}
                      onChange={(event) => setEditStudentSeats(event.target.value)}
                      className={inputClass}
                      placeholder="Blank = unlimited"
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-xs text-white/48">Teacher/staff seats</span>
                    <input
                      type="number"
                      min="1"
                      value={editTeacherSeats}
                      onChange={(event) => setEditTeacherSeats(event.target.value)}
                      className={inputClass}
                      placeholder="Blank = unlimited"
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-xs text-white/48">Start date</span>
                    <input
                      type="date"
                      value={editStartsAt}
                      onChange={(event) => setEditStartsAt(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-xs text-white/48">End date</span>
                    <input
                      type="date"
                      value={editEndsAt}
                      onChange={(event) => setEditEndsAt(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-xs text-white/48">Licence status</span>
                    <select
                      value={editLicenceStatus}
                      onChange={(event) => setEditLicenceStatus(event.target.value)}
                      className={inputClass}
                    >
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="suspended">Suspended</option>
                      <option value="expired">Expired</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </label>
                  <label className="flex items-end">
                    <span className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-violet-200/16 bg-violet-300/[0.06] px-4 text-xs font-bold text-white/72">
                      <input
                        type="checkbox"
                        checked={editIsPilot}
                        onChange={(event) => setEditIsPilot(event.target.checked)}
                        className="h-4 w-4 accent-violet-300"
                      />
                      Pilot licence
                    </span>
                  </label>
                </div>

                <button
                  type="button"
                  disabled={saving || !selected.licence_id}
                  onClick={() => void saveLicence()}
                  className="mt-5 min-h-12 rounded-full border border-violet-200/26 bg-violet-300/16 px-6 text-xs font-extrabold uppercase tracking-[0.12em] text-white"
                >
                  Save Licence
                </button>
              </article>

              <article className="rounded-[32px] border border-emerald-200/18 bg-emerald-400/[0.045] p-6 backdrop-blur-xl sm:p-7">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
                  Organisation administrator
                </p>
                <h3 className="mt-2 text-2xl font-bold">Add another manager</h3>
                <p className="mt-2 text-sm leading-6 text-white/48">
                  Existing Dreamscape accounts are linked immediately. New emails are
                  held as pending manager invitations until Phase 1C account claiming is installed.
                </p>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={additionalManagerEmail}
                    onChange={(event) => setAdditionalManagerEmail(event.target.value)}
                    className={inputClass}
                    placeholder="manager@organisation.com"
                  />
                  <button
                    type="button"
                    disabled={saving || !additionalManagerEmail.trim()}
                    onClick={() => void addManager()}
                    className="min-h-12 shrink-0 rounded-full border border-emerald-200/28 bg-emerald-300/14 px-6 text-xs font-extrabold uppercase tracking-[0.12em] text-emerald-100"
                  >
                    Add Manager
                  </button>
                </div>
              </article>
            </>
          )}
        </section>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-3xl border border-cyan-200/16 bg-white/[0.045] p-5 backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.18em] text-white/42">{label}</p>
      <p className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-white">{value}</p>
      <p className="mt-2 text-xs text-white/42">{detail}</p>
    </div>
  );
}
