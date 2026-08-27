"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type PackStatus =
  | "draft"
  | "submitted"
  | "published"
  | "rejected"
  | "archived";

type ReviewPack = {
  pack_id: string;
  creator_partner_id: string;
  creator_display_name: string;
  creator_revenue_share_percent: number;
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

type ReviewItem = {
  item_id: string;
  quiz_id: string;
  quiz_title: string;
  quiz_slug: string;
  quiz_status: string;
  question_count: number;
  sort_order: number;
};

function money(cents: number | null | undefined) {
  return `S$${(Number(cents || 0) / 100).toFixed(2)}`;
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

export default function CreatorPackReviewPanel({
  creatorPartnerId,
  creatorDisplayName,
}: {
  creatorPartnerId: string;
  creatorDisplayName: string;
}) {
  const [packs, setPacks] = useState<ReviewPack[]>([]);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [selectedPackId, setSelectedPackId] = useState("");
  const [approvedPrice, setApprovedPrice] = useState("");
  const [reviewNote, setReviewNote] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedPack = useMemo(
    () => packs.find((pack) => pack.pack_id === selectedPackId) || null,
    [packs, selectedPackId],
  );

  useEffect(() => {
    setSelectedPackId("");
    setItems([]);
    setReviewNote("");
    setApprovedPrice("");
    setMessage("");
    setErrorMessage("");
    void loadPacks();
  }, [creatorPartnerId]);

  useEffect(() => {
    if (!selectedPack) {
      setItems([]);
      return;
    }

    setApprovedPrice(
      (
        Number(
          selectedPack.approved_price_cents ??
            selectedPack.suggested_price_cents ??
            0,
        ) / 100
      ).toFixed(2),
    );
    setReviewNote(selectedPack.review_note || "");
    void loadItems(selectedPack.pack_id);
  }, [selectedPackId]);

  async function loadPacks(preferredPackId?: string) {
    setIsLoading(true);

    const { data, error } = await supabase.rpc(
      "admin_get_creator_pack_review_queue",
      { p_creator_partner_id: creatorPartnerId },
    );

    if (error) {
      setPacks([]);
      setErrorMessage(
        error.message || "Could not load premium pack review queue.",
      );
      setIsLoading(false);
      return;
    }

    const next = ((data || []) as ReviewPack[]).map((pack) => ({
      ...pack,
      creator_revenue_share_percent: Number(
        pack.creator_revenue_share_percent || 0,
      ),
      suggested_price_cents: Number(pack.suggested_price_cents || 0),
      approved_price_cents:
        pack.approved_price_cents === null
          ? null
          : Number(pack.approved_price_cents),
      item_count: Number(pack.item_count || 0),
    }));

    setPacks(next);

    const nextSelected =
      preferredPackId &&
      next.some((pack) => pack.pack_id === preferredPackId)
        ? preferredPackId
        : selectedPackId &&
            next.some((pack) => pack.pack_id === selectedPackId)
          ? selectedPackId
          : next.find((pack) => pack.status === "submitted")?.pack_id ||
            next[0]?.pack_id ||
            "";

    setSelectedPackId(nextSelected);
    setIsLoading(false);
  }

  async function loadItems(packId: string) {
    setIsLoadingItems(true);

    const { data, error } = await supabase.rpc(
      "admin_get_creator_pack_items",
      { p_pack_id: packId },
    );

    if (error) {
      setItems([]);
      setErrorMessage(
        error.message || "Could not load premium pack items.",
      );
      setIsLoadingItems(false);
      return;
    }

    setItems(
      ((data || []) as ReviewItem[]).map((item) => ({
        ...item,
        question_count: Number(item.question_count || 0),
        sort_order: Number(item.sort_order || 0),
      })),
    );
    setIsLoadingItems(false);
  }

  async function reviewPack(
    decision: "publish" | "reject" | "archive",
  ) {
    if (!selectedPack) return;

    if (decision === "reject" && !reviewNote.trim()) {
      setErrorMessage("Enter a review note before rejecting a pack.");
      return;
    }

    const priceCents = Math.round(Number(approvedPrice) * 100);

    if (
      decision === "publish" &&
      (!Number.isFinite(priceCents) ||
        priceCents < 190 ||
        priceCents > 99900)
    ) {
      setErrorMessage(
        "Approved selling price must be between S$1.90 and S$999.00.",
      );
      return;
    }

    const confirmed = window.confirm(
      decision === "publish"
        ? `Publish "${selectedPack.title}" at S$${(
            priceCents / 100
          ).toFixed(2)}? Its included quizzes will become premium content.`
        : decision === "reject"
          ? `Reject "${selectedPack.title}" and return it to the creator with feedback?`
          : `Archive "${selectedPack.title}"? Existing ownership records will remain.`,
    );

    if (!confirmed) return;

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "admin_review_creator_quiz_pack",
      {
        p_pack_id: selectedPack.pack_id,
        p_decision: decision,
        p_approved_price_cents:
          decision === "publish" ? priceCents : null,
        p_review_note: reviewNote.trim() || null,
      },
    );

    if (error) {
      setErrorMessage(error.message || "Could not review premium pack.");
      setIsSaving(false);
      return;
    }

    setMessage(
      decision === "publish"
        ? `"${selectedPack.title}" is now published.`
        : decision === "reject"
          ? `"${selectedPack.title}" was returned with feedback.`
          : `"${selectedPack.title}" has been archived.`,
    );

    await loadPacks(selectedPack.pack_id);
    setIsSaving(false);
  }

  return (
    <article className="rounded-[32px] border border-amber-200/15 bg-[linear-gradient(180deg,rgba(94,55,12,0.15),rgba(4,20,48,0.80))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200">
            Phase 5 · Premium Pack Review
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white">
            {creatorDisplayName}’s premium products
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">
            Review the pack contents and set the final one-time selling price.
            Publishing moves every included quiz out of the free club catalogue.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Metric label="Packs" value={isLoading ? "…" : packs.length} />
          <Metric
            label="Review"
            value={
              isLoading
                ? "…"
                : packs.filter((pack) => pack.status === "submitted").length
            }
          />
          <Metric
            label="Live"
            value={
              isLoading
                ? "…"
                : packs.filter((pack) => pack.status === "published").length
            }
          />
        </div>
      </div>

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

      <div className="mt-5 grid gap-5 xl:grid-cols-[310px_minmax(0,1fr)]">
        <aside className="rounded-[24px] border border-white/9 bg-black/14 p-4">
          <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
            {isLoading ? (
              <p className="text-xs text-white/38">Loading premium packs...</p>
            ) : packs.length === 0 ? (
              <p className="rounded-xl border border-white/7 bg-white/[0.02] p-4 text-xs leading-5 text-white/38">
                This creator has not built any premium packs yet.
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
                      ? "border-amber-200/28 bg-amber-300/[0.07]"
                      : "border-white/7 bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <strong className="block line-clamp-2 text-xs leading-5 text-white">
                        {pack.title}
                      </strong>
                      <small className="mt-1 block truncate text-[9px] text-white/30">
                        {pack.club_name}
                      </small>
                      <small className="mt-1 block text-[9px] text-amber-100/54">
                        {pack.item_count} quizzes ·{" "}
                        {pack.approved_price_cents
                          ? money(pack.approved_price_cents)
                          : `${money(
                              pack.suggested_price_cents,
                            )} suggested`}
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
        </aside>

        <section className="min-w-0 rounded-[24px] border border-white/9 bg-black/14 p-5">
          {!selectedPack ? (
            <div className="flex min-h-[300px] items-center justify-center text-center text-sm text-white/38">
              Select a premium pack to review it.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.13em] text-amber-100/56">
                    {selectedPack.club_name}
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-white">
                    {selectedPack.title}
                  </h3>
                  <p className="mt-2 text-xs text-white/38">
                    Creator suggestion{" "}
                    {money(selectedPack.suggested_price_cents)} · Creator share
                    setting{" "}
                    {selectedPack.creator_revenue_share_percent.toFixed(0)}%
                  </p>
                </div>

                <span
                  className={`w-fit rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.09em] ${statusClasses(
                    selectedPack.status,
                  )}`}
                >
                  {selectedPack.status}
                </span>
              </div>

              {selectedPack.description && (
                <p className="mt-4 text-xs leading-5 text-white/46">
                  {selectedPack.description}
                </p>
              )}

              <div className="mt-5">
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/32">
                  Included Quizzes
                </p>

                {isLoadingItems ? (
                  <p className="mt-3 text-xs text-white/34">
                    Loading pack contents...
                  </p>
                ) : (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {items.map((item) => (
                      <div
                        key={item.item_id}
                        className="rounded-xl border border-white/7 bg-white/[0.02] p-3"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-200/12 bg-amber-300/[0.05] text-[9px] font-black text-amber-100">
                            {item.sort_order}
                          </span>
                          <span className="min-w-0">
                            <strong className="block text-[10px] leading-4 text-white">
                              {item.quiz_title}
                            </strong>
                            <small className="mt-1 block text-[8px] text-white/28">
                              {item.question_count}/10 questions ·{" "}
                              {item.quiz_status}
                            </small>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
                <label>
                  <span className={fieldLabel}>Final Selling Price</span>
                  <div className="flex h-11 overflow-hidden rounded-full border border-amber-200/14 bg-[#061632]/82">
                    <span className="flex items-center px-3 text-[10px] font-black text-amber-100/56">
                      S$
                    </span>
                    <input
                      value={approvedPrice}
                      onChange={(event) =>
                        setApprovedPrice(event.target.value)
                      }
                      disabled={selectedPack.status !== "submitted"}
                      inputMode="decimal"
                      className="min-w-0 flex-1 bg-transparent pr-4 text-xs text-white outline-none disabled:opacity-42"
                    />
                  </div>
                </label>

                <label>
                  <span className={fieldLabel}>Review Note</span>
                  <textarea
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Required if rejecting. Optional internal/public-facing review note when publishing or archiving."
                    className="w-full resize-none rounded-2xl border border-white/9 bg-[#061632]/82 px-4 py-3 text-xs leading-5 text-white outline-none placeholder:text-white/24"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {selectedPack.status === "submitted" && (
                  <>
                    <button
                      type="button"
                      disabled={isSaving || items.length < 2}
                      onClick={() => void reviewPack("publish")}
                      className="min-h-11 rounded-full border border-emerald-200/20 bg-emerald-400/[0.08] px-5 text-[9px] font-black uppercase tracking-[0.09em] text-emerald-100 disabled:opacity-36"
                    >
                      Publish Pack
                    </button>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void reviewPack("reject")}
                      className="min-h-11 rounded-full border border-red-200/18 bg-red-400/[0.07] px-5 text-[9px] font-black uppercase tracking-[0.09em] text-red-100 disabled:opacity-36"
                    >
                      Reject with Feedback
                    </button>
                  </>
                )}

                {selectedPack.status === "published" && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void reviewPack("archive")}
                    className="min-h-11 rounded-full border border-white/10 bg-white/[0.03] px-5 text-[9px] font-black uppercase tracking-[0.09em] text-white/42 disabled:opacity-36"
                  >
                    Archive Product
                  </button>
                )}
              </div>

              {selectedPack.status === "published" && (
                <p className="mt-4 rounded-xl border border-amber-200/12 bg-amber-300/[0.04] px-3 py-3 text-[10px] leading-5 text-white/42">
                  Published pack contents are intentionally immutable in this
                  phase. This protects future purchase records and permanent
                  entitlements from silently changing after a sale.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </article>
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
    <div className="min-w-[78px] rounded-2xl border border-amber-200/11 bg-amber-300/[0.04] px-3 py-2">
      <strong className="block text-lg text-amber-100">{value}</strong>
      <span className="text-[8px] font-black uppercase tracking-[0.08em] text-white/30">
        {label}
      </span>
    </div>
  );
}

const fieldLabel =
  "mb-2 block text-[9px] font-black uppercase tracking-[0.11em] text-white/34";
