"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type CreatorClub = {
  club_id: string;
  club_name: string;
  club_slug: string;
  topic: string | null;
  status: string;
};

type PackStatus =
  | "draft"
  | "submitted"
  | "published"
  | "rejected"
  | "archived";

type CreatorPack = {
  pack_id: string;
  club_id: string;
  club_name: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  currency: string;
  suggested_price_cents: number;
  approved_price_cents: number | null;
  status: PackStatus;
  item_count: number;
  review_note: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type PackItem = {
  item_id: string;
  quiz_id: string;
  quiz_title: string;
  quiz_slug: string;
  quiz_description: string | null;
  sort_order: number;
};

type QuizOption = {
  quiz_id: string;
  title: string;
  slug: string;
  description: string | null;
  published_at: string | null;
  already_premium: boolean;
};

type PackForm = {
  clubId: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string;
  suggestedPrice: string;
};

const EMPTY_FORM: PackForm = {
  clubId: "",
  title: "",
  slug: "",
  description: "",
  coverImageUrl: "",
  suggestedPrice: "4.90",
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

function centsFromPrice(value: string) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number * 100);
}

function priceFromCents(value: number | null | undefined) {
  return ((Number(value || 0) / 100).toFixed(2));
}

function money(value: number | null | undefined) {
  return `S$${priceFromCents(value)}`;
}

function statusClasses(status: PackStatus) {
  if (status === "published") {
    return "border-emerald-200/20 bg-emerald-400/10 text-emerald-100";
  }
  if (status === "submitted") {
    return "border-cyan-200/20 bg-cyan-400/10 text-cyan-100";
  }
  if (status === "rejected") {
    return "border-red-200/20 bg-red-400/10 text-red-100";
  }
  if (status === "archived") {
    return "border-white/10 bg-white/[0.035] text-white/42";
  }
  return "border-violet-200/20 bg-violet-400/10 text-violet-100";
}

export default function CreatorPackBuilder() {
  const [clubs, setClubs] = useState<CreatorClub[]>([]);
  const [packs, setPacks] = useState<CreatorPack[]>([]);
  const [quizOptions, setQuizOptions] = useState<QuizOption[]>([]);
  const [packItems, setPackItems] = useState<PackItem[]>([]);

  const [selectedPackId, setSelectedPackId] = useState("");
  const [selectedQuizIds, setSelectedQuizIds] = useState<string[]>([]);

  const [createForm, setCreateForm] = useState<PackForm>(EMPTY_FORM);
  const [createSlugTouched, setCreateSlugTouched] = useState(false);
  const [editForm, setEditForm] = useState<PackForm>(EMPTY_FORM);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPack, setIsLoadingPack] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedPack = useMemo(
    () => packs.find((pack) => pack.pack_id === selectedPackId) || null,
    [packs, selectedPackId],
  );

  const canEdit =
    selectedPack?.status === "draft" || selectedPack?.status === "rejected";

  useEffect(() => {
    void loadBase();
  }, []);

  useEffect(() => {
    if (!selectedPack) {
      setQuizOptions([]);
      setPackItems([]);
      setSelectedQuizIds([]);
      return;
    }

    setEditForm({
      clubId: selectedPack.club_id,
      title: selectedPack.title,
      slug: selectedPack.slug,
      description: selectedPack.description || "",
      coverImageUrl: selectedPack.cover_image_url || "",
      suggestedPrice: priceFromCents(selectedPack.suggested_price_cents),
    });

    void loadSelectedPack(selectedPack);
  }, [selectedPackId]);

  async function loadBase(preferredPackId?: string) {
    setIsLoading(true);
    setErrorMessage("");

    const [clubsResponse, packsResponse] = await Promise.all([
      supabase.rpc("creator_get_my_clubs"),
      supabase.rpc("creator_get_my_packs"),
    ]);

    if (clubsResponse.error) {
      setErrorMessage(clubsResponse.error.message || "Could not load clubs.");
      setIsLoading(false);
      return;
    }

    if (packsResponse.error) {
      setErrorMessage(
        packsResponse.error.message || "Could not load premium packs.",
      );
      setIsLoading(false);
      return;
    }

    const nextClubs = (clubsResponse.data || []) as CreatorClub[];
    const nextPacks = ((packsResponse.data || []) as CreatorPack[]).map(
      (pack) => ({
        ...pack,
        suggested_price_cents: Number(pack.suggested_price_cents || 0),
        approved_price_cents:
          pack.approved_price_cents === null
            ? null
            : Number(pack.approved_price_cents),
        item_count: Number(pack.item_count || 0),
      }),
    );

    setClubs(nextClubs);
    setPacks(nextPacks);

    setCreateForm((current) => ({
      ...current,
      clubId:
        current.clubId ||
        nextClubs.find((club) => club.status === "active")?.club_id ||
        nextClubs[0]?.club_id ||
        "",
    }));

    const nextSelected =
      preferredPackId &&
      nextPacks.some((pack) => pack.pack_id === preferredPackId)
        ? preferredPackId
        : selectedPackId &&
            nextPacks.some((pack) => pack.pack_id === selectedPackId)
          ? selectedPackId
          : nextPacks[0]?.pack_id || "";

    setSelectedPackId(nextSelected);
    setIsLoading(false);
  }

  async function loadSelectedPack(pack: CreatorPack) {
    setIsLoadingPack(true);

    const [itemsResponse, optionsResponse] = await Promise.all([
      supabase.rpc("creator_get_my_pack_items", {
        p_pack_id: pack.pack_id,
      }),
      supabase.rpc("creator_get_my_pack_quiz_options", {
        p_club_id: pack.club_id,
      }),
    ]);

    if (itemsResponse.error) {
      setErrorMessage(
        itemsResponse.error.message || "Could not load pack contents.",
      );
      setPackItems([]);
      setSelectedQuizIds([]);
    } else {
      const items = ((itemsResponse.data || []) as PackItem[]).map((item) => ({
        ...item,
        sort_order: Number(item.sort_order || 0),
      }));
      setPackItems(items);
      setSelectedQuizIds(items.map((item) => item.quiz_id));
    }

    if (optionsResponse.error) {
      setErrorMessage(
        optionsResponse.error.message || "Could not load published quizzes.",
      );
      setQuizOptions([]);
    } else {
      setQuizOptions(
        ((optionsResponse.data || []) as QuizOption[]).map((quiz) => ({
          ...quiz,
          already_premium: Boolean(quiz.already_premium),
        })),
      );
    }

    setIsLoadingPack(false);
  }

  function updateCreate<K extends keyof PackForm>(
    key: K,
    value: PackForm[K],
  ) {
    setCreateForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "title" && !createSlugTouched) {
        next.slug = slugify(String(value));
      }
      return next;
    });
  }

  function updateEdit<K extends keyof PackForm>(
    key: K,
    value: PackForm[K],
  ) {
    setEditForm((current) => ({ ...current, [key]: value }));
  }

  function validate(form: PackForm) {
    if (!form.clubId) return "Choose a Creator Club.";
    if (!form.title.trim()) return "Enter a premium pack title.";
    if (!form.slug.trim()) return "Enter a premium pack slug.";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) {
      return "Pack slug can use lowercase letters, numbers and hyphens only.";
    }

    const cents = centsFromPrice(form.suggestedPrice);
    if (cents < 190 || cents > 99900) {
      return "Suggested price must be between S$1.90 and S$999.00.";
    }

    if (form.description.length > 2500) {
      return "Description must be 2500 characters or fewer.";
    }

    return "";
  }

  async function createPack() {
    const validation = validate(createForm);
    if (validation) {
      setErrorMessage(validation);
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase.rpc("creator_create_quiz_pack", {
      p_club_id: createForm.clubId,
      p_title: createForm.title.trim(),
      p_slug: createForm.slug.trim(),
      p_description: createForm.description.trim() || null,
      p_cover_image_url: createForm.coverImageUrl.trim() || null,
      p_suggested_price_cents: centsFromPrice(createForm.suggestedPrice),
    });

    if (error) {
      setErrorMessage(error.message || "Could not create premium pack.");
      setIsSaving(false);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    const packId = String(row?.pack_id || "");

    setCreateForm({
      ...EMPTY_FORM,
      clubId: createForm.clubId,
    });
    setCreateSlugTouched(false);
    setMessage(
      "Premium pack created. Choose at least 2 published quizzes before submitting.",
    );
    await loadBase(packId || undefined);
    setIsSaving(false);
  }

  async function saveMetadata() {
    if (!selectedPack) return;

    const validation = validate(editForm);
    if (validation) {
      setErrorMessage(validation);
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "creator_update_quiz_pack_metadata",
      {
        p_pack_id: selectedPack.pack_id,
        p_club_id: editForm.clubId,
        p_title: editForm.title.trim(),
        p_slug: editForm.slug.trim(),
        p_description: editForm.description.trim() || null,
        p_cover_image_url: editForm.coverImageUrl.trim() || null,
        p_suggested_price_cents: centsFromPrice(editForm.suggestedPrice),
      },
    );

    if (error) {
      setErrorMessage(error.message || "Could not save premium pack.");
      setIsSaving(false);
      return;
    }

    setMessage("Premium pack details saved.");
    await loadBase(selectedPack.pack_id);
    setIsSaving(false);
  }

  async function saveItems() {
    if (!selectedPack) return;

    if (selectedQuizIds.length < 2) {
      setErrorMessage("Select at least 2 published quizzes.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "creator_replace_quiz_pack_items",
      {
        p_pack_id: selectedPack.pack_id,
        p_quiz_ids: selectedQuizIds,
      },
    );

    if (error) {
      setErrorMessage(error.message || "Could not save pack quizzes.");
      setIsSaving(false);
      return;
    }

    setMessage(`${selectedQuizIds.length} quizzes saved to the pack.`);
    await loadBase(selectedPack.pack_id);
    setIsSaving(false);
  }

  async function submitPack() {
    if (!selectedPack) return;

    const confirmed = window.confirm(
      `Submit "${selectedPack.title}" for Dreamscape review? The pack will be locked while under review.`,
    );
    if (!confirmed) return;

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("creator_submit_quiz_pack", {
      p_pack_id: selectedPack.pack_id,
    });

    if (error) {
      setErrorMessage(error.message || "Could not submit premium pack.");
      setIsSaving(false);
      return;
    }

    setMessage("Premium pack submitted for Dreamscape review.");
    await loadBase(selectedPack.pack_id);
    setIsSaving(false);
  }

  async function archivePack() {
    if (!selectedPack) return;

    const confirmed = window.confirm(
      `Archive "${selectedPack.title}"? Draft/rejected packs can be archived permanently from the creator workspace.`,
    );
    if (!confirmed) return;

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("creator_archive_quiz_pack", {
      p_pack_id: selectedPack.pack_id,
    });

    if (error) {
      setErrorMessage(error.message || "Could not archive premium pack.");
      setIsSaving(false);
      return;
    }

    setMessage("Premium pack archived.");
    await loadBase(selectedPack.pack_id);
    setIsSaving(false);
  }

  return (
    <section className="shrink-0 rounded-[26px] border border-amber-200/14 bg-[linear-gradient(145deg,rgba(92,52,10,0.15),rgba(5,16,38,0.72))] p-4 shadow-[0_22px_64px_rgba(0,0,0,0.22)] sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-amber-100/64">
            Phase 5 · Premium Content
          </p>
          <h2 className="mt-1 text-xl font-black text-white">
            Premium Quiz Packs
          </h2>
          <p className="mt-1 max-w-3xl text-[10px] leading-4 text-white/40">
            Bundle published quizzes into a one-time-purchase product. Dreamscape
            approves the final selling price before the pack appears in the
            club storefront.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Metric label="Packs" value={isLoading ? "…" : packs.length} />
          <Metric
            label="Published"
            value={
              isLoading
                ? "…"
                : packs.filter((pack) => pack.status === "published").length
            }
          />
          <Metric
            label="Review"
            value={
              isLoading
                ? "…"
                : packs.filter((pack) => pack.status === "submitted").length
            }
          />
        </div>
      </div>

      {message && (
        <p className="mt-3 rounded-xl border border-emerald-200/14 bg-emerald-400/[0.06] px-3 py-2 text-[10px] text-emerald-100">
          {message}
        </p>
      )}

      {errorMessage && (
        <p className="mt-3 rounded-xl border border-red-200/14 bg-red-400/[0.06] px-3 py-2 text-[10px] text-red-100">
          {errorMessage}
        </p>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-[22px] border border-white/8 bg-black/14 p-3">
          <p className="text-[8px] font-black uppercase tracking-[0.13em] text-amber-100/54">
            New Pack
          </p>

          <div className="mt-3 grid gap-2">
            <select
              value={createForm.clubId}
              onChange={(event) => updateCreate("clubId", event.target.value)}
              className={inputClass}
            >
              {clubs.length === 0 ? (
                <option value="">No Creator Clubs</option>
              ) : (
                clubs.map((club) => (
                  <option key={club.club_id} value={club.club_id}>
                    {club.club_name} · {club.status}
                  </option>
                ))
              )}
            </select>

            <input
              value={createForm.title}
              onChange={(event) => updateCreate("title", event.target.value)}
              placeholder="Premium pack title"
              className={inputClass}
            />

            <input
              value={createForm.slug}
              onChange={(event) => {
                setCreateSlugTouched(true);
                updateCreate("slug", slugify(event.target.value));
              }}
              placeholder="premium-pack-slug"
              className={inputClass}
            />

            <div className="flex h-10 overflow-hidden rounded-full border border-amber-200/12 bg-[#061632]/82">
              <span className="flex items-center px-3 text-[9px] font-black text-amber-100/56">
                S$
              </span>
              <input
                value={createForm.suggestedPrice}
                onChange={(event) =>
                  updateCreate("suggestedPrice", event.target.value)
                }
                inputMode="decimal"
                placeholder="4.90"
                className="min-w-0 flex-1 bg-transparent pr-4 text-[10px] text-white outline-none"
              />
            </div>

            <textarea
              value={createForm.description}
              onChange={(event) =>
                updateCreate("description", event.target.value)
              }
              rows={3}
              maxLength={2500}
              placeholder="What is included in this pack?"
              className={textareaClass}
            />

            <input
              value={createForm.coverImageUrl}
              onChange={(event) =>
                updateCreate("coverImageUrl", event.target.value)
              }
              placeholder="Cover image URL (optional)"
              className={inputClass}
            />

            <button
              type="button"
              disabled={isSaving || clubs.length === 0}
              onClick={() => void createPack()}
              className={primaryButton}
            >
              Create Premium Pack
            </button>
          </div>

          <div className="mt-4 border-t border-white/7 pt-3">
            <p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/30">
              My Packs
            </p>

            <div className="mt-2 max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {packs.length === 0 ? (
                <p className="rounded-xl border border-white/7 bg-white/[0.02] p-3 text-[10px] leading-4 text-white/34">
                  No premium packs yet.
                </p>
              ) : (
                packs.map((pack) => (
                  <button
                    key={pack.pack_id}
                    type="button"
                    onClick={() => {
                      setSelectedPackId(pack.pack_id);
                      setMessage("");
                      setErrorMessage("");
                    }}
                    className={`w-full rounded-xl border p-3 text-left ${
                      selectedPackId === pack.pack_id
                        ? "border-amber-200/26 bg-amber-300/[0.07]"
                        : "border-white/7 bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <strong className="block truncate text-[10px] text-white">
                          {pack.title}
                        </strong>
                        <small className="mt-1 block truncate text-[8px] text-white/28">
                          {pack.club_name}
                        </small>
                        <small className="mt-1 block text-[8px] text-amber-100/52">
                          {pack.item_count} quiz
                          {pack.item_count === 1 ? "" : "zes"} ·{" "}
                          {pack.approved_price_cents
                            ? money(pack.approved_price_cents)
                            : `${money(pack.suggested_price_cents)} suggested`}
                        </small>
                      </span>

                      <span
                        className={`rounded-full border px-2 py-1 text-[7px] font-black uppercase tracking-[0.07em] ${statusClasses(
                          pack.status,
                        )}`}
                      >
                        {pack.status}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <article className="min-w-0 rounded-[22px] border border-white/8 bg-black/14 p-4">
          {!selectedPack ? (
            <div className="flex min-h-[280px] items-center justify-center text-center text-xs text-white/34">
              Create or select a premium pack.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.13em] text-amber-100/52">
                    {selectedPack.club_name}
                  </p>
                  <h3 className="mt-1 text-2xl font-black text-white">
                    {selectedPack.title}
                  </h3>
                  <p className="mt-1 text-[9px] text-white/30">
                    Suggested {money(selectedPack.suggested_price_cents)}
                    {selectedPack.approved_price_cents
                      ? ` · Approved ${money(
                          selectedPack.approved_price_cents,
                        )}`
                      : ""}
                  </p>
                </div>

                <span
                  className={`w-fit rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.08em] ${statusClasses(
                    selectedPack.status,
                  )}`}
                >
                  {selectedPack.status}
                </span>
              </div>

              {selectedPack.review_note && (
                <div className="mt-3 rounded-xl border border-red-200/13 bg-red-400/[0.05] px-3 py-3">
                  <p className="text-[8px] font-black uppercase tracking-[0.1em] text-red-100/62">
                    Dreamscape Review Feedback
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-red-50/72">
                    {selectedPack.review_note}
                  </p>
                </div>
              )}

              <div className="mt-4 grid gap-2 md:grid-cols-2">
                <select
                  value={editForm.clubId}
                  onChange={(event) =>
                    updateEdit("clubId", event.target.value)
                  }
                  disabled={!canEdit}
                  className={inputClass}
                >
                  {clubs.map((club) => (
                    <option key={club.club_id} value={club.club_id}>
                      {club.club_name} · {club.status}
                    </option>
                  ))}
                </select>

                <input
                  value={editForm.title}
                  onChange={(event) =>
                    updateEdit("title", event.target.value)
                  }
                  disabled={!canEdit}
                  placeholder="Pack title"
                  className={inputClass}
                />

                <input
                  value={editForm.slug}
                  onChange={(event) =>
                    updateEdit("slug", slugify(event.target.value))
                  }
                  disabled={!canEdit}
                  placeholder="pack-slug"
                  className={inputClass}
                />

                <div className="flex h-10 overflow-hidden rounded-full border border-white/9 bg-[#061632]/82">
                  <span className="flex items-center px-3 text-[9px] font-black text-white/34">
                    Suggested S$
                  </span>
                  <input
                    value={editForm.suggestedPrice}
                    onChange={(event) =>
                      updateEdit("suggestedPrice", event.target.value)
                    }
                    disabled={!canEdit}
                    inputMode="decimal"
                    className="min-w-0 flex-1 bg-transparent pr-4 text-[10px] text-white outline-none disabled:opacity-42"
                  />
                </div>

                <input
                  value={editForm.coverImageUrl}
                  onChange={(event) =>
                    updateEdit("coverImageUrl", event.target.value)
                  }
                  disabled={!canEdit}
                  placeholder="Cover image URL"
                  className={inputClass}
                />
              </div>

              <textarea
                value={editForm.description}
                onChange={(event) =>
                  updateEdit("description", event.target.value)
                }
                disabled={!canEdit}
                rows={3}
                maxLength={2500}
                placeholder="Pack description"
                className={`${textareaClass} mt-2`}
              />

              {canEdit && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void saveMetadata()}
                  className={`${secondaryButton} mt-3`}
                >
                  Save Pack Details
                </button>
              )}

              <section className="mt-4 border-t border-white/7 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/32">
                      Included Published Quizzes
                    </p>
                    <p className="mt-1 text-[9px] text-white/24">
                      Select 2–50 quizzes from this club.
                    </p>
                  </div>
                  <strong className="text-lg text-amber-100">
                    {selectedQuizIds.length}
                  </strong>
                </div>

                {isLoadingPack ? (
                  <p className="mt-3 text-[10px] text-white/30">
                    Loading published quizzes...
                  </p>
                ) : quizOptions.length === 0 ? (
                  <p className="mt-3 rounded-xl border border-white/7 bg-white/[0.02] p-3 text-[10px] leading-4 text-white/34">
                    This club has no published quizzes available for a pack yet.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {quizOptions.map((quiz) => {
                      const checked = selectedQuizIds.includes(quiz.quiz_id);

                      return (
                        <label
                          key={quiz.quiz_id}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${
                            checked
                              ? "border-amber-200/20 bg-amber-300/[0.05]"
                              : "border-white/7 bg-white/[0.02]"
                          } ${!canEdit ? "cursor-default opacity-70" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!canEdit}
                            onChange={(event) => {
                              setSelectedQuizIds((current) =>
                                event.target.checked
                                  ? [...current, quiz.quiz_id]
                                  : current.filter((id) => id !== quiz.quiz_id),
                              );
                            }}
                            className="mt-0.5 h-4 w-4 accent-amber-300"
                          />

                          <span className="min-w-0">
                            <strong className="block text-[10px] text-white">
                              {quiz.title}
                            </strong>
                            <small className="mt-1 block text-[8px] leading-4 text-white/28">
                              {quiz.description ||
                                "Published 10-question creator quiz."}
                            </small>
                            {quiz.already_premium && (
                              <small className="mt-1 block text-[8px] font-bold text-cyan-100/56">
                                Already included in another premium pack
                              </small>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {canEdit && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isSaving || selectedQuizIds.length < 2}
                      onClick={() => void saveItems()}
                      className={primaryButton}
                    >
                      Save Included Quizzes
                    </button>

                    <button
                      type="button"
                      disabled={
                        isSaving ||
                        selectedQuizIds.length < 2 ||
                        selectedPack.item_count < 2
                      }
                      onClick={() => void submitPack()}
                      className="min-h-10 rounded-full border border-cyan-200/20 bg-cyan-400/[0.08] px-4 text-[8px] font-black uppercase tracking-[0.09em] text-cyan-100 disabled:cursor-not-allowed disabled:opacity-34"
                    >
                      Submit for Review
                    </button>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void archivePack()}
                      className="min-h-10 rounded-full border border-white/9 bg-white/[0.025] px-4 text-[8px] font-black uppercase tracking-[0.09em] text-white/38 disabled:opacity-34"
                    >
                      Archive
                    </button>
                  </div>
                )}
              </section>

              {selectedPack.status === "published" && (
                <div className="mt-4 rounded-xl border border-emerald-200/13 bg-emerald-400/[0.05] px-3 py-3">
                  <p className="text-[8px] font-black uppercase tracking-[0.1em] text-emerald-100/62">
                    Published Product
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-white/44">
                    This pack is locked for product integrity. Its quizzes are
                    now premium content and no longer appear in the club’s free
                    quiz list. Dreamscape Admin can archive the product, but
                    ownership records remain intact.
                  </p>
                </div>
              )}
            </>
          )}
        </article>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-[70px] rounded-xl border border-amber-200/10 bg-amber-300/[0.035] px-3 py-2">
      <strong className="block text-base text-amber-100">{value}</strong>
      <span className="text-[7px] font-black uppercase tracking-[0.08em] text-white/28">
        {label}
      </span>
    </div>
  );
}

const inputClass =
  "h-10 w-full min-w-0 rounded-full border border-white/9 bg-[#061632]/82 px-4 text-[10px] text-white outline-none placeholder:text-white/24 focus:border-amber-200/24 disabled:cursor-not-allowed disabled:opacity-42";

const textareaClass =
  "w-full resize-none rounded-2xl border border-white/9 bg-[#061632]/82 px-4 py-3 text-[10px] leading-4 text-white outline-none placeholder:text-white/24 focus:border-amber-200/24 disabled:cursor-not-allowed disabled:opacity-42";

const primaryButton =
  "min-h-10 rounded-full border border-amber-200/20 bg-amber-300/[0.08] px-4 text-[8px] font-black uppercase tracking-[0.09em] text-amber-100 disabled:cursor-not-allowed disabled:opacity-34";

const secondaryButton =
  "min-h-10 rounded-full border border-white/9 bg-white/[0.025] px-4 text-[8px] font-black uppercase tracking-[0.09em] text-white/44 disabled:cursor-not-allowed disabled:opacity-34";
