"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import CreatorClubsLockedScreen from "@/components/milo/CreatorClubsLockedScreen";
import {
  getMiloQuizHallCreatorClubsAccess,
  type MiloQuizHallCreatorClubsAccess,
} from "@/lib/milo-quiz-hall-access";

type PackDetail = {
  pack_id: string;
  creator_partner_id: string;
  creator_display_name: string;
  creator_slug: string;
  club_id: string;
  club_name: string;
  club_slug: string;
  title: string;
  pack_slug: string;
  description: string | null;
  cover_image_url: string | null;
  currency: string;
  price_cents: number;
  item_count: number;
  status: string;
  published_at: string | null;
  is_admin: boolean;
  is_owned: boolean;
  entitlement_source: string | null;
  entitlement_granted_at: string | null;
};

type PackQuiz = {
  quiz_id: string;
  quiz_slug: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  sort_order: number;
  can_play: boolean;
};

function money(cents: number | null | undefined) {
  return `S$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function formatOwnedDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function CreatorPremiumPackPage() {
  const params = useParams<{ slug: string; packSlug: string }>();
  const router = useRouter();

  const clubSlug = decodeURIComponent(String(params?.slug || ""));
  const packSlug = decodeURIComponent(String(params?.packSlug || ""));

  const [hallAccess, setHallAccess] =
    useState<MiloQuizHallCreatorClubsAccess | null>(null);
  const [pack, setPack] = useState<PackDetail | null>(null);
  const [quizzes, setQuizzes] = useState<PackQuiz[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [checkoutSessionId, setCheckoutSessionId] = useState("");
  const [isVerifyingCheckout, setIsVerifyingCheckout] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const oldBody = document.body.style.overflow;
    const oldHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    void loadPack();

    return () => {
      document.body.style.overflow = oldBody;
      document.documentElement.style.overflow = oldHtml;
    };
  }, [clubSlug, packSlug]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const checkout = query.get("checkout");
    const sessionId = query.get("session_id") || "";

    if (checkout === "cancelled") {
      setMessage("Checkout was cancelled. You have not been charged.");
    }

    if (checkout === "success" && sessionId) {
      setCheckoutSessionId(sessionId);
      setMessage(
        "Payment completed. Dreamscape is confirming your permanent pack access...",
      );
    }
  }, []);

  useEffect(() => {
    if (
      !checkoutSessionId ||
      !isAuthenticated ||
      isLoading ||
      isVerifyingCheckout
    ) {
      return;
    }

    void verifyStripeCheckout(checkoutSessionId);
  }, [
    checkoutSessionId,
    isAuthenticated,
    isLoading,
    isVerifyingCheckout,
  ]);

  async function loadPack() {
    setIsLoading(true);
    setErrorMessage("");

    const accessResult = await getMiloQuizHallCreatorClubsAccess();
    setHallAccess(accessResult.access);

    if (!accessResult.access.canAccess) {
      setPack(null);
      setIsLoading(false);
      return;
    }

    const userResponse = await supabase.auth.getUser();
    setIsAuthenticated(Boolean(userResponse.data.user));

    const { data, error } = await supabase.rpc("get_creator_pack_detail", {
      p_club_slug: clubSlug,
      p_pack_slug: packSlug,
    });

    if (error) {
      setErrorMessage(error.message || "Could not load premium pack.");
      setPack(null);
      setIsLoading(false);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;

    if (!row) {
      setPack(null);
      setIsLoading(false);
      return;
    }

    const nextPack: PackDetail = {
      ...(row as PackDetail),
      price_cents: Number(row.price_cents || 0),
      item_count: Number(row.item_count || 0),
      is_admin: Boolean(row.is_admin),
      is_owned: Boolean(row.is_owned),
    };

    setPack(nextPack);

    const quizResponse = await supabase.rpc("get_creator_pack_quizzes", {
      p_pack_id: nextPack.pack_id,
    });

    if (quizResponse.error) {
      setErrorMessage(
        quizResponse.error.message || "Could not load pack quizzes.",
      );
      setQuizzes([]);
    } else {
      setQuizzes(
        ((quizResponse.data || []) as PackQuiz[]).map((quiz) => ({
          ...quiz,
          sort_order: Number(quiz.sort_order || 0),
          can_play: Boolean(quiz.can_play),
        })),
      );
    }

    setIsLoading(false);
  }

  async function startStripeCheckout() {
    if (!pack) return;

    if (!isAuthenticated) {
      goToLogin();
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/creator-packs/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packId: pack.pack_id,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
        redirectUrl?: string;
      };

      if (!response.ok || !result.redirectUrl) {
        throw new Error(
          result.error || "Unable to start premium pack checkout.",
        );
      }

      window.location.href = result.redirectUrl;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to start premium pack checkout.";

      if (/already own/i.test(message)) {
        setMessage("This premium pack is already in your library.");
        await loadPack();
      } else {
        setErrorMessage(message);
      }

      setIsSaving(false);
    }
  }

  async function verifyStripeCheckout(sessionId: string) {
    setIsVerifyingCheckout(true);
    setErrorMessage("");

    try {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const { data, error } = await supabase.rpc(
          "get_my_creator_pack_checkout_status",
          {
            p_checkout_session_id: sessionId,
          },
        );

        if (error) throw error;

        const row = Array.isArray(data) ? data[0] : data;

        if (row?.is_owned) {
          setMessage(
            "Payment confirmed. This premium pack is now permanently unlocked on your Dreamscape account.",
          );
          setCheckoutSessionId("");
          window.history.replaceState(
            {},
            "",
            `/milo-world/quiz-hall/clubs/${encodeURIComponent(
              clubSlug,
            )}/packs/${encodeURIComponent(packSlug)}`,
          );
          await loadPack();
          return;
        }

        const status = String(row?.order_status || "");

        if (
          [
            "payment_failed",
            "cancelled",
            "refunded",
            "disputed",
            "chargeback",
          ].includes(status)
        ) {
          throw new Error(
            status === "payment_failed"
              ? "Stripe could not complete the payment."
              : "This checkout did not produce an active premium pack entitlement.",
          );
        }

        await new Promise((resolve) => window.setTimeout(resolve, 1000));
      }

      setCheckoutSessionId("");
      setMessage(
        "Stripe has returned you to Dreamscape, but the payment webhook is still being confirmed. Refresh this page shortly; the pack unlocks only after Stripe confirms payment.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not confirm premium pack payment.",
      );
    } finally {
      setIsVerifyingCheckout(false);
    }
  }

  async function grantAdminTestAccess() {
    if (!pack?.is_admin) return;

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "admin_grant_creator_pack_test_to_self",
      { p_pack_id: pack.pack_id },
    );

    if (error) {
      setErrorMessage(
        error.message || "Could not grant admin test access.",
      );
      setIsSaving(false);
      return;
    }

    setMessage("Admin test entitlement granted. You can now play every quiz.");
    await loadPack();
    setIsSaving(false);
  }

  async function revokeAdminTestAccess() {
    if (!pack?.is_admin || pack.entitlement_source !== "admin_test") return;

    const confirmed = window.confirm(
      "Remove your Phase 5 admin-test entitlement for this pack?",
    );
    if (!confirmed) return;

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "admin_revoke_creator_pack_test_from_self",
      { p_pack_id: pack.pack_id },
    );

    if (error) {
      setErrorMessage(
        error.message || "Could not remove admin test access.",
      );
      setIsSaving(false);
      return;
    }

    setMessage("Admin test entitlement removed.");
    await loadPack();
    setIsSaving(false);
  }

  function goToLogin() {
    const next = `/milo-world/quiz-hall/clubs/${encodeURIComponent(
      clubSlug,
    )}/packs/${encodeURIComponent(packSlug)}`;

    router.push(`/login?next=${encodeURIComponent(next)}`);
  }

  if (isLoading) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-[#020711] text-sm text-white/54">
        Loading premium pack...
      </main>
    );
  }

  if (hallAccess && !hallAccess.canAccess) {
    return <CreatorClubsLockedScreen />;
  }

  if (!pack) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-[#020711] px-5 text-white">
        <section className="w-full max-w-lg rounded-[28px] border border-white/10 bg-white/[0.045] p-8 text-center">
          <h1 className="text-3xl font-black">Pack unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-white/44">
            This premium pack is not currently available to this account.
          </p>
          <Link
            href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(
              clubSlug,
            )}`}
            className="mt-6 inline-flex min-h-[44px] items-center rounded-full border border-violet-200/18 bg-violet-300/[0.07] px-5 text-[9px] font-black uppercase tracking-[0.1em] text-violet-100 no-underline"
          >
            Back to Club
          </Link>
        </section>
      </main>
    );
  }


  return (
    <main className="fixed inset-0 overflow-hidden bg-[#020711] text-white">
      {pack.cover_image_url && (
        <img
          src={pack.cover_image_url}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-22"
        />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,7,17,0.64),rgba(2,7,17,0.94)_38%,rgba(2,7,17,1))]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <header className="shrink-0 p-3 sm:p-5">
          <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3">
            <Link
              href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(
                clubSlug,
              )}`}
              className="inline-flex min-h-[40px] items-center rounded-full border border-white/12 bg-[#041122]/76 px-4 text-[9px] font-black uppercase tracking-[0.1em] text-white/62 no-underline"
            >
              ← {pack.club_name}
            </Link>

            {isAuthenticated && (
              <Link
                href="/milo-world/quiz-hall/library"
                className="inline-flex min-h-[40px] items-center rounded-full border border-violet-200/16 bg-violet-300/[0.06] px-4 text-[9px] font-black uppercase tracking-[0.1em] text-violet-100 no-underline"
              >
                My Premium Packs
              </Link>
            )}
          </div>
        </header>

        <section className="dream-pack-scroll mx-auto min-h-0 w-full max-w-[1180px] flex-1 overflow-y-auto px-4 pb-8 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
            <article className="rounded-[30px] border border-violet-200/14 bg-[linear-gradient(145deg,rgba(38,20,63,0.72),rgba(5,15,34,0.90))] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-violet-200/16 bg-violet-300/[0.07] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.11em] text-violet-100">
                  Premium Quiz Pack
                </span>
                <span className="rounded-full border border-white/9 bg-white/[0.03] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.09em] text-white/38">
                  {pack.item_count} quiz{pack.item_count === 1 ? "" : "zes"}
                </span>
                {pack.status === "archived" && (
                  <span className="rounded-full border border-amber-200/16 bg-amber-300/[0.06] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.09em] text-amber-100">
                    No Longer on Sale
                  </span>
                )}
              </div>

              <h1 className="mt-4 font-serif text-[clamp(40px,6vw,70px)] font-normal leading-[0.94]">
                {pack.title}
              </h1>

              <p className="mt-3 text-xs font-bold text-violet-100/62">
                by {pack.creator_display_name} · {pack.club_name}
              </p>

              {pack.description && (
                <p className="mt-5 max-w-3xl whitespace-pre-line text-sm leading-7 text-white/52">
                  {pack.description}
                </p>
              )}

              <div className="mt-6 grid grid-cols-3 gap-2">
                <InfoBox label="One-time" value={money(pack.price_cents)} />
                <InfoBox
                  label="Included"
                  value={`${pack.item_count} quizzes`}
                />
                <InfoBox
                  label="Ownership"
                  value={pack.is_owned ? "Unlocked" : "Permanent"}
                />
              </div>
            </article>

            <aside className="rounded-[30px] border border-amber-200/14 bg-[linear-gradient(180deg,rgba(78,45,10,0.18),rgba(5,16,34,0.90))] p-5 backdrop-blur-xl">
              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-100/62">
                Pack Access
              </p>

              <strong className="mt-3 block text-4xl text-amber-100">
                {money(pack.price_cents)}
              </strong>
              <span className="text-[10px] text-white/34">
                one-time account unlock
              </span>

              {message && (
                <p className="mt-4 rounded-xl border border-emerald-200/13 bg-emerald-400/[0.06] px-3 py-2 text-[10px] leading-4 text-emerald-100">
                  {message}
                </p>
              )}

              {errorMessage && (
                <p className="mt-4 rounded-xl border border-red-200/13 bg-red-400/[0.06] px-3 py-2 text-[10px] leading-4 text-red-100">
                  {errorMessage}
                </p>
              )}

              {pack.is_owned ? (
                <>
                  <div className="mt-5 rounded-2xl border border-emerald-200/16 bg-emerald-400/[0.07] px-4 py-4 text-center">
                    <strong className="block text-sm text-emerald-100">
                      Pack Owned
                    </strong>
                    <span className="mt-1 block text-[9px] leading-4 text-white/34">
                      {pack.entitlement_granted_at
                        ? `Unlocked ${formatOwnedDate(
                            pack.entitlement_granted_at,
                          )}`
                        : "Permanent entitlement active"}
                    </span>
                  </div>

                  {pack.is_admin &&
                    pack.entitlement_source === "admin_test" && (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void revokeAdminTestAccess()}
                        className="mt-3 min-h-10 w-full rounded-full border border-white/9 bg-white/[0.03] px-4 text-[8px] font-black uppercase tracking-[0.09em] text-white/40 disabled:opacity-36"
                      >
                        Remove Test Access
                      </button>
                    )}
                </>
              ) : pack.is_admin ? (
                <>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void grantAdminTestAccess()}
                    className="mt-5 min-h-11 w-full rounded-full border border-violet-200/20 bg-violet-300/[0.08] px-5 text-[9px] font-black uppercase tracking-[0.1em] text-violet-100 disabled:opacity-36"
                  >
                    {isSaving ? "Granting..." : "Grant Admin Test Access"}
                  </button>
                  <p className="mt-3 text-center text-[8px] leading-4 text-white/26">
                    Creates an admin-test order + entitlement. No money is charged and the test entitlement is excluded from paid revenue reporting.
                  </p>
                </>
              ) : !isAuthenticated ? (
                <button
                  type="button"
                  onClick={goToLogin}
                  className="mt-5 min-h-11 w-full rounded-full border border-violet-200/20 bg-violet-300/[0.08] px-5 text-[9px] font-black uppercase tracking-[0.1em] text-violet-100"
                >
                  Log In to Unlock
                </button>
              ) : pack.status === "published" ? (
                <>
                  <button
                    type="button"
                    disabled={isSaving || isVerifyingCheckout}
                    onClick={() => void startStripeCheckout()}
                    className="mt-5 min-h-11 w-full rounded-full border border-violet-200/20 bg-violet-300/[0.09] px-5 text-[9px] font-black uppercase tracking-[0.1em] text-violet-100 shadow-[0_18px_44px_rgba(139,92,246,0.08)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSaving
                      ? "Opening Stripe..."
                      : isVerifyingCheckout
                        ? "Confirming Payment..."
                        : `Unlock Pack · ${money(pack.price_cents)}`}
                  </button>
                  <p className="mt-3 text-center text-[8px] leading-4 text-white/28">
                    Secure one-time Stripe Checkout. Access is granted only
                    after Dreamscape receives Stripe’s verified payment webhook.
                  </p>
                </>
              ) : (
                <div className="mt-5 rounded-xl border border-amber-200/12 bg-amber-300/[0.04] px-3 py-3 text-center text-[9px] text-amber-100/62">
                  This owned-product record is archived and no longer available
                  for new unlocks.
                </div>
              )}
            </aside>
          </div>

          <section className="mt-4 rounded-[28px] border border-white/9 bg-white/[0.035] p-5 backdrop-blur-xl sm:p-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-violet-100/58">
                  Included Quizzes
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  {pack.is_owned || pack.is_admin
                    ? "Your premium quiz library"
                    : "Inside this pack"}
                </h2>
              </div>
              <strong className="text-3xl text-violet-100">
                {quizzes.length}
              </strong>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {quizzes.map((quiz) => (
                <article
                  key={quiz.quiz_id}
                  className="relative overflow-hidden rounded-[22px] border border-white/8 bg-black/16 p-4"
                >
                  {quiz.cover_image_url && (
                    <img
                      src={quiz.cover_image_url}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-10"
                    />
                  )}

                  <div className="relative z-10">
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-violet-200/12 bg-violet-300/[0.05] text-[9px] font-black text-violet-100">
                        {quiz.sort_order}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-black leading-5 text-white">
                          {quiz.title}
                        </h3>
                        {quiz.description && (
                          <p className="mt-2 line-clamp-2 text-[9px] leading-4 text-white/34">
                            {quiz.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end border-t border-white/7 pt-3">
                      {quiz.can_play ? (
                        <Link
                          href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(
                            pack.club_slug,
                          )}/quiz/${encodeURIComponent(quiz.quiz_slug)}`}
                          className="rounded-full border border-cyan-200/18 bg-cyan-300/[0.07] px-4 py-2 text-[8px] font-black uppercase tracking-[0.09em] text-cyan-100 no-underline"
                        >
                          Play Quiz →
                        </Link>
                      ) : (
                        <span className="rounded-full border border-white/9 bg-white/[0.025] px-4 py-2 text-[8px] font-black uppercase tracking-[0.09em] text-white/30">
                          Locked
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      </div>

      <style jsx>{`
        .dream-pack-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(196, 181, 253, 0.30)
            rgba(255, 255, 255, 0.04);
        }
        .dream-pack-scroll::-webkit-scrollbar {
          width: 7px;
        }
        .dream-pack-scroll::-webkit-scrollbar-thumb {
          background: rgba(196, 181, 253, 0.30);
          border-radius: 999px;
        }
      `}</style>
    </main>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/14 px-3 py-3">
      <strong className="block text-sm text-white">{value}</strong>
      <span className="mt-1 block text-[7px] font-black uppercase tracking-[0.08em] text-white/26">
        {label}
      </span>
    </div>
  );
}
