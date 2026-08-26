"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ClubStatus = "draft" | "active" | "suspended" | "archived";

type ClubRow = {
  id: string;
  creator_partner_id: string;
  name: string;
  slug: string;
  topic: string | null;
  tagline: string | null;
  description: string | null;
  cover_image_url: string | null;
  logo_image_url: string | null;
  featured: boolean;
  sort_order: number;
  status: ClubStatus;
  member_count: number;
  created_at: string;
  updated_at: string;
  activated_at: string | null;
};

type ClubForm = {
  name: string;
  slug: string;
  topic: string;
  tagline: string;
  description: string;
  coverImageUrl: string;
  logoImageUrl: string;
  featured: boolean;
  sortOrder: number;
};

const EMPTY_FORM: ClubForm = {
  name: "",
  slug: "",
  topic: "",
  tagline: "",
  description: "",
  coverImageUrl: "",
  logoImageUrl: "",
  featured: false,
  sortOrder: 100,
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function formFromClub(club: ClubRow): ClubForm {
  return {
    name: club.name || "",
    slug: club.slug || "",
    topic: club.topic || "",
    tagline: club.tagline || "",
    description: club.description || "",
    coverImageUrl: club.cover_image_url || "",
    logoImageUrl: club.logo_image_url || "",
    featured: Boolean(club.featured),
    sortOrder: Number(club.sort_order || 0),
  };
}

function statusClass(status: ClubStatus) {
  if (status === "active") {
    return "border-emerald-200/22 bg-emerald-400/10 text-emerald-100";
  }
  if (status === "suspended") {
    return "border-amber-200/22 bg-amber-400/10 text-amber-100";
  }
  if (status === "archived") {
    return "border-red-200/20 bg-red-400/10 text-red-100";
  }
  return "border-violet-200/22 bg-violet-400/10 text-violet-100";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CreatorClubsAdminPanel({
  creatorPartnerId,
  creatorDisplayName,
  creatorStatus,
}: {
  creatorPartnerId: string;
  creatorDisplayName: string;
  creatorStatus: string;
}) {
  const [clubs, setClubs] = useState<ClubRow[]>([]);
  const [selectedClubId, setSelectedClubId] = useState("");
  const [createForm, setCreateForm] = useState<ClubForm>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<ClubForm>(EMPTY_FORM);
  const [createSlugTouched, setCreateSlugTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedClub = useMemo(
    () => clubs.find((club) => club.id === selectedClubId) || null,
    [clubs, selectedClubId],
  );

  const activeCount = clubs.filter((club) => club.status === "active").length;
  const totalMembers = clubs.reduce(
    (sum, club) => sum + Number(club.member_count || 0),
    0,
  );

  useEffect(() => {
    setSelectedClubId("");
    setCreateForm(EMPTY_FORM);
    setEditForm(EMPTY_FORM);
    setCreateSlugTouched(false);
    setMessage("");
    setErrorMessage("");
    void loadClubs();
  }, [creatorPartnerId]);

  useEffect(() => {
    if (selectedClub) {
      setEditForm(formFromClub(selectedClub));
    }
  }, [selectedClub]);

  async function loadClubs(preferredClubId?: string) {
    setIsLoading(true);

    const { data, error } = await supabase.rpc("admin_get_creator_clubs", {
      p_creator_partner_id: creatorPartnerId,
    });

    if (error) {
      setClubs([]);
      setErrorMessage(error.message || "Could not load creator clubs.");
      setIsLoading(false);
      return;
    }

    const next = ((data || []) as ClubRow[]).map((row) => ({
      ...row,
      featured: Boolean(row.featured),
      sort_order: Number(row.sort_order || 0),
      member_count: Number(row.member_count || 0),
    }));

    setClubs(next);

    const nextSelected =
      preferredClubId && next.some((club) => club.id === preferredClubId)
        ? preferredClubId
        : selectedClubId && next.some((club) => club.id === selectedClubId)
          ? selectedClubId
          : next[0]?.id || "";

    setSelectedClubId(nextSelected);
    setIsLoading(false);
  }

  function updateCreate<K extends keyof ClubForm>(
    key: K,
    value: ClubForm[K],
  ) {
    setCreateForm((current) => {
      const next = { ...current, [key]: value };

      if (key === "name" && !createSlugTouched) {
        next.slug = slugify(String(value));
      }

      return next;
    });
  }

  function updateEdit<K extends keyof ClubForm>(
    key: K,
    value: ClubForm[K],
  ) {
    setEditForm((current) => ({ ...current, [key]: value }));
  }

  function validate(form: ClubForm) {
    if (!form.name.trim()) return "Enter a club name.";
    if (!form.slug.trim()) return "Enter a club slug.";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) {
      return "Club slug can use lowercase letters, numbers and hyphens only.";
    }
    if (form.tagline.length > 180) return "Tagline must be 180 characters or fewer.";
    if (form.description.length > 3000) {
      return "Description must be 3000 characters or fewer.";
    }
    if (!Number.isFinite(Number(form.sortOrder))) {
      return "Sort order must be a number.";
    }
    return "";
  }

  async function createClub() {
    const validationError = validate(createForm);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase.rpc("admin_create_creator_club", {
      p_creator_partner_id: creatorPartnerId,
      p_name: createForm.name.trim(),
      p_slug: createForm.slug.trim(),
      p_topic: createForm.topic.trim() || null,
      p_tagline: createForm.tagline.trim() || null,
      p_description: createForm.description.trim() || null,
      p_cover_image_url: createForm.coverImageUrl.trim() || null,
      p_logo_image_url: createForm.logoImageUrl.trim() || null,
      p_featured: createForm.featured,
      p_sort_order: Math.round(Number(createForm.sortOrder || 0)),
    });

    if (error) {
      setErrorMessage(error.message || "Could not create creator club.");
      setIsSaving(false);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    const createdId = String(row?.club_id || "");

    setCreateForm(EMPTY_FORM);
    setCreateSlugTouched(false);
    setMessage("Creator club created as a draft.");
    await loadClubs(createdId || undefined);
    setIsSaving(false);
  }

  async function saveClub() {
    if (!selectedClub) return;

    const validationError = validate(editForm);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("admin_update_creator_club", {
      p_club_id: selectedClub.id,
      p_name: editForm.name.trim(),
      p_slug: editForm.slug.trim(),
      p_topic: editForm.topic.trim() || null,
      p_tagline: editForm.tagline.trim() || null,
      p_description: editForm.description.trim() || null,
      p_cover_image_url: editForm.coverImageUrl.trim() || null,
      p_logo_image_url: editForm.logoImageUrl.trim() || null,
      p_featured: editForm.featured,
      p_sort_order: Math.round(Number(editForm.sortOrder || 0)),
    });

    if (error) {
      setErrorMessage(error.message || "Could not update creator club.");
      setIsSaving(false);
      return;
    }

    setMessage("Creator club saved.");
    await loadClubs(selectedClub.id);
    setIsSaving(false);
  }

  async function setStatus(status: ClubStatus) {
    if (!selectedClub) return;

    const label =
      status === "active"
        ? "activate"
        : status === "draft"
          ? "return to draft"
          : status === "suspended"
            ? "suspend"
            : "archive";

    const confirmed = window.confirm(
      `Are you sure you want to ${label} ${selectedClub.name}?`,
    );
    if (!confirmed) return;

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("admin_set_creator_club_status", {
      p_club_id: selectedClub.id,
      p_status: status,
    });

    if (error) {
      setErrorMessage(error.message || "Could not update club status.");
      setIsSaving(false);
      return;
    }

    setMessage(`${selectedClub.name} is now ${status}.`);
    await loadClubs(selectedClub.id);
    setIsSaving(false);
  }

  return (
    <article className="rounded-[32px] border border-cyan-200/16 bg-[linear-gradient(180deg,rgba(18,75,96,0.15),rgba(4,20,48,0.78))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-[#8dfcff]">
            Phase 2 · Creator Clubs
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white">
            {creatorDisplayName}’s communities
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/52">
            Clubs are free communities inside Milo’s Quiz Hall. A creator can
            operate multiple niche clubs, and Dreamscape users can join any
            number of them.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <MiniMetric label="Clubs" value={isLoading ? "…" : clubs.length} />
          <MiniMetric label="Active" value={isLoading ? "…" : activeCount} />
          <MiniMetric label="Members" value={isLoading ? "…" : totalMembers} />
        </div>
      </div>

      {creatorStatus !== "active" && (
        <p className="mt-5 rounded-2xl border border-amber-200/18 bg-amber-400/[0.07] px-5 py-4 text-sm leading-6 text-amber-100/82">
          This creator is currently {creatorStatus}. Clubs can be prepared as
          drafts, but a club can only be activated while the creator partner is
          active.
        </p>
      )}

      {message && (
        <p className="mt-5 rounded-2xl border border-emerald-200/18 bg-emerald-400/[0.07] px-5 py-4 text-sm text-emerald-100">
          {message}
        </p>
      )}

      {errorMessage && (
        <p className="mt-5 rounded-2xl border border-red-200/18 bg-red-400/[0.07] px-5 py-4 text-sm text-red-100">
          {errorMessage}
        </p>
      )}

      <section className="mt-6 rounded-[24px] border border-white/10 bg-black/16 p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/70">
              New community
            </p>
            <h3 className="mt-2 text-xl font-black text-white">Create club</h3>
          </div>
          <span className="rounded-full border border-violet-200/16 bg-violet-400/[0.07] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-violet-100">
            Starts as draft
          </span>
        </div>

        <ClubFields
          form={createForm}
          onChange={updateCreate}
          onSlugTouched={() => setCreateSlugTouched(true)}
        />

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void createClub()}
            className={primaryButton}
          >
            {isSaving ? "Saving..." : "Create Club"}
          </button>
        </div>
      </section>

      <div className="mt-6 grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-[24px] border border-white/10 bg-black/14 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/38">
            Creator clubs
          </p>

          <div className="dream-admin-scroll mt-3 max-h-[560px] space-y-2 overflow-y-auto pr-1">
            {isLoading ? (
              <p className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-xs text-white/42">
                Loading clubs...
              </p>
            ) : clubs.length === 0 ? (
              <p className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-xs leading-5 text-white/42">
                No clubs yet. Create the creator’s first niche community above.
              </p>
            ) : (
              clubs.map((club) => (
                <button
                  key={club.id}
                  type="button"
                  onClick={() => {
                    setSelectedClubId(club.id);
                    setMessage("");
                    setErrorMessage("");
                  }}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    club.id === selectedClubId
                      ? "border-cyan-200/30 bg-cyan-300/[0.08]"
                      : "border-white/8 bg-white/[0.025] hover:border-white/16"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-cyan-200/14 bg-cyan-300/[0.07] text-sm font-black text-cyan-100">
                      {club.logo_image_url ? (
                        <img
                          src={club.logo_image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        club.name.charAt(0).toUpperCase()
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-xs text-white">
                        {club.name}
                      </strong>
                      <small className="mt-1 block truncate text-[10px] text-white/36">
                        {club.topic || "General"}
                      </small>
                      <small className="mt-1 block text-[9px] text-cyan-100/56">
                        {club.member_count} member{club.member_count === 1 ? "" : "s"}
                      </small>
                    </span>
                    <span
                      className={`rounded-full border px-2 py-1 text-[7px] font-black uppercase tracking-[0.07em] ${statusClass(
                        club.status,
                      )}`}
                    >
                      {club.status}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="min-w-0">
          {!selectedClub ? (
            <div className="flex min-h-[260px] items-center justify-center rounded-[24px] border border-white/10 bg-black/14 p-6 text-center text-sm text-white/42">
              Select a club to edit it.
            </div>
          ) : (
            <div className="rounded-[24px] border border-white/10 bg-black/14 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-100/60">
                    Club profile
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-white">
                    {selectedClub.name}
                  </h3>
                  <p className="mt-2 text-xs text-white/40">
                    Created {formatDate(selectedClub.created_at)} ·{" "}
                    {selectedClub.member_count} active member
                    {selectedClub.member_count === 1 ? "" : "s"}
                  </p>
                </div>

                {selectedClub.status === "active" && (
                  <a
                    href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(
                      selectedClub.slug,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-fit rounded-full border border-cyan-200/22 bg-cyan-300/[0.08] px-4 py-2 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100 no-underline"
                  >
                    Open Public Club ↗
                  </a>
                )}
              </div>

              <ClubFields form={editForm} onChange={updateEdit} />

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void saveClub()}
                  className={primaryButton}
                >
                  Save Club
                </button>

                {selectedClub.status !== "active" && (
                  <button
                    type="button"
                    disabled={isSaving || creatorStatus !== "active"}
                    onClick={() => void setStatus("active")}
                    className="min-h-11 rounded-full border border-emerald-200/22 bg-emerald-400/10 px-4 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Activate
                  </button>
                )}

                {selectedClub.status !== "draft" && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void setStatus("draft")}
                    className="min-h-11 rounded-full border border-violet-200/22 bg-violet-400/10 px-4 text-[10px] font-black uppercase tracking-[0.1em] text-violet-100 disabled:opacity-40"
                  >
                    Set Draft
                  </button>
                )}

                {selectedClub.status !== "suspended" &&
                  selectedClub.status !== "archived" && (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void setStatus("suspended")}
                      className="min-h-11 rounded-full border border-amber-200/22 bg-amber-400/10 px-4 text-[10px] font-black uppercase tracking-[0.1em] text-amber-100 disabled:opacity-40"
                    >
                      Suspend
                    </button>
                  )}

                {selectedClub.status !== "archived" && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void setStatus("archived")}
                    className="min-h-11 rounded-full border border-red-200/20 bg-red-400/10 px-4 text-[10px] font-black uppercase tracking-[0.1em] text-red-100 disabled:opacity-40"
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </article>
  );
}

function ClubFields({
  form,
  onChange,
  onSlugTouched,
}: {
  form: ClubForm;
  onChange: <K extends keyof ClubForm>(key: K, value: ClubForm[K]) => void;
  onSlugTouched?: () => void;
}) {
  return (
    <>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Club name">
          <input
            value={form.name}
            onChange={(event) => onChange("name", event.target.value)}
            placeholder="World Geography Club"
            className={inputClass}
          />
        </Field>

        <Field label="Public slug">
          <input
            value={form.slug}
            onChange={(event) => {
              onSlugTouched?.();
              onChange("slug", slugify(event.target.value));
            }}
            placeholder="world-geography"
            className={inputClass}
          />
        </Field>

        <Field label="Topic">
          <input
            value={form.topic}
            onChange={(event) => onChange("topic", event.target.value)}
            placeholder="Geography"
            className={inputClass}
          />
        </Field>

        <Field label="Tagline">
          <input
            value={form.tagline}
            maxLength={180}
            onChange={(event) => onChange("tagline", event.target.value)}
            placeholder="For people who know the world."
            className={inputClass}
          />
        </Field>

        <Field label="Logo image URL">
          <input
            value={form.logoImageUrl}
            onChange={(event) => onChange("logoImageUrl", event.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
        </Field>

        <Field label="Cover image URL">
          <input
            value={form.coverImageUrl}
            onChange={(event) => onChange("coverImageUrl", event.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
        </Field>

        <Field label="Discovery order">
          <input
            type="number"
            value={form.sortOrder}
            onChange={(event) =>
              onChange("sortOrder", Number(event.target.value) || 0)
            }
            className={inputClass}
          />
        </Field>

        <label className="flex h-12 items-center gap-3 self-end rounded-2xl border border-cyan-200/14 bg-[#061632]/75 px-4 text-xs font-bold text-white/64">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(event) => onChange("featured", event.target.checked)}
            className="h-4 w-4 accent-cyan-300"
          />
          Feature in Creator Clubs
        </label>
      </div>

      <Field label="Club description" className="mt-4">
        <textarea
          value={form.description}
          rows={4}
          maxLength={3000}
          onChange={(event) => onChange("description", event.target.value)}
          placeholder="Describe the club, its niche and what members can expect."
          className={textareaClass}
        />
      </Field>
    </>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.12em] text-white/38">
        {label}
      </span>
      {children}
    </label>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-[78px] rounded-2xl border border-cyan-200/12 bg-cyan-300/[0.05] px-3 py-2">
      <strong className="block text-lg text-cyan-100">{value}</strong>
      <span className="text-[8px] font-black uppercase tracking-[0.09em] text-white/32">
        {label}
      </span>
    </div>
  );
}

const inputClass =
  "h-11 w-full min-w-0 rounded-2xl border border-cyan-200/14 bg-[#061632]/78 px-4 text-xs text-white outline-none transition placeholder:text-white/26 focus:border-cyan-200/38";

const textareaClass =
  "w-full resize-none rounded-2xl border border-cyan-200/14 bg-[#061632]/78 px-4 py-3 text-xs leading-5 text-white outline-none transition placeholder:text-white/26 focus:border-cyan-200/38";

const primaryButton =
  "min-h-11 rounded-full border border-cyan-200/22 bg-cyan-300/10 px-5 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100 transition hover:bg-cyan-300/16 disabled:cursor-not-allowed disabled:opacity-40";
