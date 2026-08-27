"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import CreatorClubsAdminPanel from "@/components/admin/CreatorClubsAdminPanel";
import CreatorQuizReviewPanel from "@/components/admin/CreatorQuizReviewPanel";
import CreatorPackReviewPanel from "@/components/admin/CreatorPackReviewPanel";

type CreatorStatus = "pending" | "active" | "suspended" | "terminated";

type CreatorPartner = {
  id: string;
  creator_number: string;
  user_id: string | null;
  linked_email: string | null;
  linked_username: string | null;
  legal_name: string;
  display_name: string;
  slug: string;
  email: string;
  country: string | null;
  profile_image_url: string | null;
  bio: string | null;
  social_links: Record<string, string>;
  revenue_share_percent: number;
  status: CreatorStatus;
  admin_notes: string | null;
  activated_at: string | null;
  suspended_at: string | null;
  terminated_at: string | null;
  created_at: string;
  updated_at: string;
};

type AccountCandidate = {
  user_id: string;
  email: string | null;
  username: string | null;
  user_role: string;
  creator_partner_id: string | null;
  creator_display_name: string | null;
};

type CreatorForm = {
  userId: string;
  legalName: string;
  displayName: string;
  slug: string;
  email: string;
  country: string;
  profileImageUrl: string;
  bio: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  website: string;
  revenueSharePercent: number;
  adminNotes: string;
};

const EMPTY_FORM: CreatorForm = {
  userId: "",
  legalName: "",
  displayName: "",
  slug: "",
  email: "",
  country: "",
  profileImageUrl: "",
  bio: "",
  instagram: "",
  tiktok: "",
  youtube: "",
  website: "",
  revenueSharePercent: 70,
  adminNotes: "",
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function statusLabel(status: CreatorStatus) {
  if (status === "pending") return "Pending";
  if (status === "active") return "Active";
  if (status === "suspended") return "Suspended";
  return "Terminated";
}

function statusClasses(status: CreatorStatus) {
  if (status === "active") {
    return "border-emerald-200/22 bg-emerald-400/10 text-emerald-100";
  }
  if (status === "suspended") {
    return "border-amber-200/22 bg-amber-400/10 text-amber-100";
  }
  if (status === "terminated") {
    return "border-red-200/22 bg-red-400/10 text-red-100";
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

function socialLinksFromForm(form: CreatorForm) {
  return Object.fromEntries(
    [
      ["instagram", form.instagram.trim()],
      ["tiktok", form.tiktok.trim()],
      ["youtube", form.youtube.trim()],
      ["website", form.website.trim()],
    ].filter(([, value]) => Boolean(value)),
  );
}

function formFromCreator(creator: CreatorPartner): CreatorForm {
  const links = creator.social_links || {};

  return {
    userId: creator.user_id || "",
    legalName: creator.legal_name || "",
    displayName: creator.display_name || "",
    slug: creator.slug || "",
    email: creator.email || "",
    country: creator.country || "",
    profileImageUrl: creator.profile_image_url || "",
    bio: creator.bio || "",
    instagram: links.instagram || "",
    tiktok: links.tiktok || "",
    youtube: links.youtube || "",
    website: links.website || "",
    revenueSharePercent: Number(creator.revenue_share_percent || 70),
    adminNotes: creator.admin_notes || "",
  };
}

export default function CreatorPartnersPanel() {
  const [creators, setCreators] = useState<CreatorPartner[]>([]);
  const [accountCandidates, setAccountCandidates] = useState<AccountCandidate[]>([]);
  const [selectedCreatorId, setSelectedCreatorId] = useState("");
  const [search, setSearch] = useState("");

  const [createForm, setCreateForm] = useState<CreatorForm>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<CreatorForm>(EMPTY_FORM);
  const [createSlugTouched, setCreateSlugTouched] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedCreator = useMemo(
    () => creators.find((creator) => creator.id === selectedCreatorId) || null,
    [creators, selectedCreatorId],
  );

  const filteredCreators = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return creators;

    return creators.filter((creator) =>
      [
        creator.creator_number,
        creator.display_name,
        creator.legal_name,
        creator.slug,
        creator.email,
        creator.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [creators, search]);

  const metrics = useMemo(() => {
    return {
      total: creators.length,
      active: creators.filter((creator) => creator.status === "active").length,
      pending: creators.filter((creator) => creator.status === "pending").length,
      averageShare:
        creators.length === 0
          ? 0
          : creators.reduce(
              (sum, creator) => sum + Number(creator.revenue_share_percent || 0),
              0,
            ) / creators.length,
    };
  }, [creators]);

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (selectedCreator) {
      setEditForm(formFromCreator(selectedCreator));
    }
  }, [selectedCreator]);

  async function loadAll(preferredCreatorId?: string) {
    setIsLoading(true);
    setErrorMessage("");

    const [partnersResponse, accountsResponse] = await Promise.all([
      supabase.rpc("admin_get_creator_partners"),
      supabase.rpc("admin_get_creator_account_candidates"),
    ]);

    if (partnersResponse.error) {
      setCreators([]);
      setErrorMessage(
        partnersResponse.error.message || "Could not load creator partners.",
      );
      setIsLoading(false);
      return;
    }

    if (accountsResponse.error) {
      setAccountCandidates([]);
      setErrorMessage(
        accountsResponse.error.message || "Could not load Dreamscape accounts.",
      );
      setIsLoading(false);
      return;
    }

    const nextCreators = ((partnersResponse.data || []) as CreatorPartner[]).map(
      (creator) => ({
        ...creator,
        social_links:
          creator.social_links && typeof creator.social_links === "object"
            ? creator.social_links
            : {},
        revenue_share_percent: Number(creator.revenue_share_percent || 70),
      }),
    );

    setCreators(nextCreators);
    setAccountCandidates(
      (accountsResponse.data || []) as AccountCandidate[],
    );

    const nextSelected =
      preferredCreatorId &&
      nextCreators.some((creator) => creator.id === preferredCreatorId)
        ? preferredCreatorId
        : selectedCreatorId &&
            nextCreators.some((creator) => creator.id === selectedCreatorId)
          ? selectedCreatorId
          : nextCreators[0]?.id || "";

    setSelectedCreatorId(nextSelected);
    setIsLoading(false);
  }

  function updateCreate<K extends keyof CreatorForm>(
    key: K,
    value: CreatorForm[K],
  ) {
    setCreateForm((current) => {
      const next = { ...current, [key]: value };

      if (key === "displayName" && !createSlugTouched) {
        next.slug = slugify(String(value)) as CreatorForm[K & "slug"];
      }

      if (key === "userId") {
        const account = accountCandidates.find(
          (candidate) => candidate.user_id === value,
        );

        if (account?.email && !current.email.trim()) {
          next.email = account.email as CreatorForm[K & "email"];
        }
      }

      return next;
    });
  }

  function updateEdit<K extends keyof CreatorForm>(
    key: K,
    value: CreatorForm[K],
  ) {
    setEditForm((current) => ({ ...current, [key]: value }));
  }

  function validateForm(form: CreatorForm) {
    if (!form.legalName.trim()) return "Enter the creator's legal/contact name.";
    if (!form.displayName.trim()) return "Enter the creator display name.";
    if (!form.slug.trim()) return "Enter a creator slug.";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) {
      return "Creator slug can use lowercase letters, numbers and hyphens only.";
    }
    if (!form.email.trim() || !form.email.includes("@")) {
      return "Enter a valid creator contact email.";
    }

    const share = Number(form.revenueSharePercent);
    if (!Number.isFinite(share) || share < 60 || share > 80) {
      return "Creator revenue share must be between 60% and 80%.";
    }

    return "";
  }

  async function createCreator() {
    const validationError = validateForm(createForm);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase.rpc("admin_create_creator_partner", {
      p_user_id: createForm.userId || null,
      p_legal_name: createForm.legalName.trim(),
      p_display_name: createForm.displayName.trim(),
      p_slug: createForm.slug.trim(),
      p_email: createForm.email.trim(),
      p_country: createForm.country.trim() || null,
      p_profile_image_url: createForm.profileImageUrl.trim() || null,
      p_bio: createForm.bio.trim() || null,
      p_social_links: socialLinksFromForm(createForm),
      p_revenue_share_percent: Number(createForm.revenueSharePercent),
      p_admin_notes: createForm.adminNotes.trim() || null,
    });

    if (error) {
      setErrorMessage(error.message || "Could not create the creator partner.");
      setIsSaving(false);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    const createdId = String(row?.creator_partner_id || "");

    setCreateForm(EMPTY_FORM);
    setCreateSlugTouched(false);
    setMessage("Creator partner created.");
    await loadAll(createdId || undefined);
    setIsSaving(false);
  }

  async function saveCreator() {
    if (!selectedCreator) return;

    const validationError = validateForm(editForm);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("admin_update_creator_partner", {
      p_creator_partner_id: selectedCreator.id,
      p_user_id: editForm.userId || null,
      p_legal_name: editForm.legalName.trim(),
      p_display_name: editForm.displayName.trim(),
      p_slug: editForm.slug.trim(),
      p_email: editForm.email.trim(),
      p_country: editForm.country.trim() || null,
      p_profile_image_url: editForm.profileImageUrl.trim() || null,
      p_bio: editForm.bio.trim() || null,
      p_social_links: socialLinksFromForm(editForm),
      p_revenue_share_percent: Number(editForm.revenueSharePercent),
      p_admin_notes: editForm.adminNotes.trim() || null,
    });

    if (error) {
      setErrorMessage(error.message || "Could not update the creator partner.");
      setIsSaving(false);
      return;
    }

    setMessage("Creator partner details saved.");
    await loadAll(selectedCreator.id);
    setIsSaving(false);
  }

  async function setCreatorStatus(nextStatus: CreatorStatus) {
    if (!selectedCreator) return;

    const action =
      nextStatus === "active"
        ? "activate"
        : nextStatus === "suspended"
          ? "suspend"
          : nextStatus === "terminated"
            ? "terminate"
            : "move back to pending";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${selectedCreator.display_name}?`,
    );

    if (!confirmed) return;

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("admin_set_creator_partner_status", {
      p_creator_partner_id: selectedCreator.id,
      p_status: nextStatus,
    });

    if (error) {
      setErrorMessage(error.message || "Could not update creator status.");
      setIsSaving(false);
      return;
    }

    setMessage(
      `${selectedCreator.display_name} is now ${statusLabel(nextStatus).toLowerCase()}.`,
    );
    await loadAll(selectedCreator.id);
    setIsSaving(false);
  }

  return (
    <section className="mt-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Creator Partners" value={isLoading ? "..." : metrics.total.toLocaleString()} />
        <MetricCard label="Active" value={isLoading ? "..." : metrics.active.toLocaleString()} tone="green" />
        <MetricCard label="Pending" value={isLoading ? "..." : metrics.pending.toLocaleString()} tone="violet" />
        <MetricCard
          label="Average Creator Share"
          value={isLoading ? "..." : `${metrics.averageShare.toFixed(metrics.averageShare % 1 ? 1 : 0)}%`}
          tone="amber"
        />
      </div>

      {message && (
        <p className="mt-5 rounded-2xl border border-emerald-200/20 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-100">
          {message}
        </p>
      )}

      {errorMessage && (
        <p className="mt-5 rounded-2xl border border-red-200/20 bg-red-400/10 px-5 py-4 text-sm text-red-100">
          {errorMessage}
        </p>
      )}

      <section className="mt-6 rounded-[32px] border border-amber-200/18 bg-[linear-gradient(180deg,rgba(91,56,15,0.20),rgba(4,20,48,0.80))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-amber-200">
              Creator Partner Programme
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white">
              Add creator partner
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/52">
              Create the creator identity first. Clubs, quiz publishing, pack sales and
              creator payouts will connect to this record in later phases.
            </p>
          </div>

          <span className="w-fit rounded-full border border-amber-200/20 bg-amber-300/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-amber-100">
            Creator share 60–80%
          </span>
        </div>

        <CreatorFormFields
          form={createForm}
          accounts={accountCandidates}
          currentCreatorId={null}
          onChange={updateCreate}
          onSlugTouched={() => setCreateSlugTouched(true)}
        />

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => {
              setCreateForm(EMPTY_FORM);
              setCreateSlugTouched(false);
              setErrorMessage("");
            }}
            className="min-h-12 rounded-full border border-white/12 bg-white/[0.04] px-5 text-xs font-extrabold uppercase tracking-[0.1em] text-white/60 transition hover:border-white/22 hover:text-white disabled:opacity-45"
          >
            Clear
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => void createCreator()}
            className="min-h-12 rounded-full border border-amber-200/26 bg-amber-300/14 px-6 text-xs font-extrabold uppercase tracking-[0.12em] text-amber-50 shadow-[0_14px_34px_rgba(251,191,36,0.08)] transition hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isSaving ? "Saving..." : "Create Creator Partner"}
          </button>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="h-fit rounded-[32px] border border-amber-200/16 bg-white/[0.045] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl xl:sticky xl:top-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-amber-200">
                Directory
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em]">
                Creators
              </h2>
            </div>
            <strong className="text-3xl text-amber-200">{creators.length}</strong>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search creator, email or slug"
            className={`${inputClass} mt-5`}
          />

          <div className="dream-admin-scroll mt-4 max-h-[720px] space-y-2 overflow-y-auto pr-1">
            {isLoading ? (
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-white/48">
                Loading creator partners...
              </p>
            ) : filteredCreators.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-white/48">
                No creator partners found.
              </p>
            ) : (
              filteredCreators.map((creator) => {
                const selected = creator.id === selectedCreatorId;

                return (
                  <button
                    key={creator.id}
                    type="button"
                    onClick={() => {
                      setSelectedCreatorId(creator.id);
                      setMessage("");
                      setErrorMessage("");
                    }}
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      selected
                        ? "border-amber-200/42 bg-amber-300/10"
                        : "border-white/10 bg-white/[0.025] hover:border-amber-200/24"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-amber-200/16 bg-amber-300/10 font-extrabold text-amber-100">
                        {creator.profile_image_url ? (
                          <img
                            src={creator.profile_image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          creator.display_name.charAt(0).toUpperCase()
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm text-white">
                          {creator.display_name}
                        </strong>
                        <small className="mt-1 block truncate text-[11px] text-white/42">
                          @{creator.slug}
                        </small>
                        <small className="mt-1 block text-[10px] text-amber-100/70">
                          {Number(creator.revenue_share_percent).toFixed(0)}% creator share
                        </small>
                      </span>

                      <span
                        className={`rounded-full border px-2 py-1 text-[8px] font-extrabold uppercase tracking-[0.08em] ${statusClasses(
                          creator.status,
                        )}`}
                      >
                        {statusLabel(creator.status)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="min-w-0">
          {!selectedCreator ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-[32px] border border-amber-200/16 bg-white/[0.045] p-8 text-center text-white/48 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl">
              Create or select a creator partner to manage their profile.
            </div>
          ) : (
            <div className="space-y-6">
            <article className="rounded-[32px] border border-amber-200/16 bg-white/[0.045] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:p-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-amber-200">
                    {selectedCreator.creator_number}
                  </p>
                  <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white">
                    {selectedCreator.display_name}
                  </h2>
                  <p className="mt-2 text-sm text-white/48">
                    Created {formatDate(selectedCreator.created_at)}
                    {selectedCreator.linked_email
                      ? ` · Linked to ${selectedCreator.linked_email}`
                      : " · No Dreamscape account linked"}
                  </p>
                </div>

                <span
                  className={`w-fit rounded-full border px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] ${statusClasses(
                    selectedCreator.status,
                  )}`}
                >
                  {statusLabel(selectedCreator.status)}
                </span>
              </div>

              <CreatorFormFields
                form={editForm}
                accounts={accountCandidates}
                currentCreatorId={selectedCreator.id}
                onChange={updateEdit}
              />

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void saveCreator()}
                  className="min-h-12 rounded-full border border-amber-200/26 bg-amber-300/14 px-6 text-xs font-extrabold uppercase tracking-[0.12em] text-amber-50 transition hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {isSaving ? "Saving..." : "Save Creator"}
                </button>

                {selectedCreator.status !== "active" && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void setCreatorStatus("active")}
                    className="min-h-12 rounded-full border border-emerald-200/24 bg-emerald-400/10 px-5 text-xs font-extrabold uppercase tracking-[0.1em] text-emerald-100 transition hover:bg-emerald-400/16 disabled:opacity-45"
                  >
                    Activate
                  </button>
                )}

                {selectedCreator.status !== "suspended" &&
                  selectedCreator.status !== "terminated" && (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void setCreatorStatus("suspended")}
                      className="min-h-12 rounded-full border border-amber-200/24 bg-amber-400/10 px-5 text-xs font-extrabold uppercase tracking-[0.1em] text-amber-100 transition hover:bg-amber-400/16 disabled:opacity-45"
                    >
                      Suspend
                    </button>
                  )}

                {selectedCreator.status !== "pending" &&
                  selectedCreator.status !== "terminated" && (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void setCreatorStatus("pending")}
                      className="min-h-12 rounded-full border border-violet-200/24 bg-violet-400/10 px-5 text-xs font-extrabold uppercase tracking-[0.1em] text-violet-100 transition hover:bg-violet-400/16 disabled:opacity-45"
                    >
                      Set Pending
                    </button>
                  )}

                {selectedCreator.status !== "terminated" && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void setCreatorStatus("terminated")}
                    className="min-h-12 rounded-full border border-red-200/24 bg-red-400/10 px-5 text-xs font-extrabold uppercase tracking-[0.1em] text-red-100 transition hover:bg-red-400/16 disabled:opacity-45"
                  >
                    Terminate
                  </button>
                )}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <InfoBox label="Activated" value={formatDate(selectedCreator.activated_at)} />
                <InfoBox label="Suspended" value={formatDate(selectedCreator.suspended_at)} />
                <InfoBox label="Terminated" value={formatDate(selectedCreator.terminated_at)} />
              </div>
            </article>

            <CreatorClubsAdminPanel
              creatorPartnerId={selectedCreator.id}
              creatorDisplayName={selectedCreator.display_name}
              creatorStatus={selectedCreator.status}
            />

            <CreatorQuizReviewPanel
              creatorPartnerId={selectedCreator.id}
              creatorDisplayName={selectedCreator.display_name}
            />

            <CreatorPackReviewPanel
              creatorPartnerId={selectedCreator.id}
              creatorDisplayName={selectedCreator.display_name}
            />
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function CreatorFormFields({
  form,
  accounts,
  currentCreatorId,
  onChange,
  onSlugTouched,
}: {
  form: CreatorForm;
  accounts: AccountCandidate[];
  currentCreatorId: string | null;
  onChange: <K extends keyof CreatorForm>(key: K, value: CreatorForm[K]) => void;
  onSlugTouched?: () => void;
}) {
  const availableAccounts = accounts.filter(
    (account) =>
      !account.creator_partner_id ||
      account.creator_partner_id === currentCreatorId ||
      account.user_id === form.userId,
  );

  return (
    <>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Dreamscape account">
          <select
            value={form.userId}
            onChange={(event) => onChange("userId", event.target.value)}
            className={inputClass}
          >
            <option value="">Not linked yet</option>
            {availableAccounts.map((account) => (
              <option key={account.user_id} value={account.user_id}>
                {account.username || account.email || account.user_id}
                {account.email && account.username ? ` · ${account.email}` : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Legal / contact name">
          <input
            value={form.legalName}
            onChange={(event) => onChange("legalName", event.target.value)}
            placeholder="Full name"
            className={inputClass}
          />
        </Field>

        <Field label="Public display name">
          <input
            value={form.displayName}
            onChange={(event) => onChange("displayName", event.target.value)}
            placeholder="Quiz Monster"
            className={inputClass}
          />
        </Field>

        <Field label="Creator slug">
          <div className="flex h-12 overflow-hidden rounded-2xl border border-amber-200/16 bg-[#061632]/85 focus-within:border-amber-200/45">
            <span className="flex items-center border-r border-white/10 px-3 text-xs text-white/34">
              /creator/
            </span>
            <input
              value={form.slug}
              onChange={(event) => {
                onSlugTouched?.();
                onChange("slug", slugify(event.target.value));
              }}
              placeholder="quiz-monster"
              className="min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-white/28"
            />
          </div>
        </Field>

        <Field label="Contact email">
          <input
            type="email"
            value={form.email}
            onChange={(event) => onChange("email", event.target.value)}
            placeholder="creator@example.com"
            className={inputClass}
          />
        </Field>

        <Field label="Country">
          <input
            value={form.country}
            onChange={(event) => onChange("country", event.target.value)}
            placeholder="Singapore"
            className={inputClass}
          />
        </Field>

        <Field label="Creator revenue share">
          <div className="flex h-12 items-center overflow-hidden rounded-2xl border border-amber-200/16 bg-[#061632]/85 focus-within:border-amber-200/45">
            <input
              type="number"
              min={60}
              max={80}
              step={1}
              value={form.revenueSharePercent}
              onChange={(event) =>
                onChange(
                  "revenueSharePercent",
                  Math.max(0, Number(event.target.value) || 0),
                )
              }
              className="min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none"
            />
            <span className="px-4 text-sm font-bold text-amber-100">%</span>
          </div>
        </Field>

        <Field label="Profile image URL">
          <input
            value={form.profileImageUrl}
            onChange={(event) => onChange("profileImageUrl", event.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
        </Field>

        <Field label="Website">
          <input
            value={form.website}
            onChange={(event) => onChange("website", event.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
        </Field>

        <Field label="Instagram">
          <input
            value={form.instagram}
            onChange={(event) => onChange("instagram", event.target.value)}
            placeholder="@handle or URL"
            className={inputClass}
          />
        </Field>

        <Field label="TikTok">
          <input
            value={form.tiktok}
            onChange={(event) => onChange("tiktok", event.target.value)}
            placeholder="@handle or URL"
            className={inputClass}
          />
        </Field>

        <Field label="YouTube">
          <input
            value={form.youtube}
            onChange={(event) => onChange("youtube", event.target.value)}
            placeholder="@channel or URL"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Field label="Short bio">
          <textarea
            value={form.bio}
            onChange={(event) => onChange("bio", event.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Short public creator description..."
            className={`${textareaClass}`}
          />
        </Field>

        <Field label="Internal admin notes">
          <textarea
            value={form.adminNotes}
            onChange={(event) => onChange("adminNotes", event.target.value)}
            rows={4}
            maxLength={4000}
            placeholder="Private notes, negotiated terms, outreach context..."
            className={`${textareaClass}`}
          />
        </Field>
      </div>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
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

function MetricCard({
  label,
  value,
  tone = "cyan",
}: {
  label: string;
  value: string;
  tone?: "cyan" | "green" | "violet" | "amber";
}) {
  const className =
    tone === "green"
      ? "border-emerald-200/18 bg-emerald-400/[0.06] text-emerald-200"
      : tone === "violet"
        ? "border-violet-200/18 bg-violet-400/[0.06] text-violet-200"
        : tone === "amber"
          ? "border-amber-200/18 bg-amber-400/[0.06] text-amber-100"
          : "border-cyan-200/18 bg-cyan-400/[0.06] text-[#8dfcff]";

  return (
    <div
      className={`rounded-3xl border p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl ${className}`}
    >
      <p className="text-xs uppercase tracking-[0.18em] text-white/42">{label}</p>
      <p className="mt-2 text-4xl font-extrabold tracking-[-0.04em]">{value}</p>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/34">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-white/70">{value}</p>
    </div>
  );
}

const inputClass =
  "h-12 w-full min-w-0 rounded-2xl border border-amber-200/16 bg-[#061632]/85 px-4 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-amber-200/45";

const textareaClass =
  "w-full resize-none rounded-2xl border border-amber-200/16 bg-[#061632]/85 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/28 focus:border-amber-200/45";
