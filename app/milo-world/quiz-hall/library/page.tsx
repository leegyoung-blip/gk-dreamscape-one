"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import CreatorClubsLockedScreen from "@/components/milo/CreatorClubsLockedScreen";
import {
  getMiloQuizHallCreatorClubsAccess,
  type MiloQuizHallCreatorClubsAccess,
} from "@/lib/milo-quiz-hall-access";

type LibraryPack = {
  pack_id: string;
  pack_slug: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  club_id: string;
  club_name: string;
  club_slug: string;
  creator_display_name: string;
  currency: string;
  price_cents_snapshot: number;
  entitlement_source: string;
  granted_at: string;
  pack_status: string;
  item_count: number;
};

function money(cents: number | null | undefined) {
  return `S$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function CreatorPremiumLibraryPage() {
  const router = useRouter();
  const [hallAccess, setHallAccess] =
    useState<MiloQuizHallCreatorClubsAccess | null>(null);
  const [packs, setPacks] = useState<LibraryPack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const oldBody = document.body.style.overflow;
    const oldHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    void loadLibrary();

    return () => {
      document.body.style.overflow = oldBody;
      document.documentElement.style.overflow = oldHtml;
    };
  }, []);

  async function loadLibrary() {
    setIsLoading(true);

    const accessResult = await getMiloQuizHallCreatorClubsAccess();
    setHallAccess(accessResult.access);

    if (!accessResult.access.canAccess) {
      setIsLoading(false);
      return;
    }

    const userResponse = await supabase.auth.getUser();

    if (!userResponse.data.user) {
      router.replace(
        `/login?next=${encodeURIComponent(
          "/milo-world/quiz-hall/library",
        )}`,
      );
      return;
    }

    const { data, error } = await supabase.rpc(
      "get_my_creator_pack_library",
    );

    if (error) {
      setErrorMessage(
        error.message || "Could not load your premium pack library.",
      );
      setPacks([]);
      setIsLoading(false);
      return;
    }

    setPacks(
      ((data || []) as LibraryPack[]).map((pack) => ({
        ...pack,
        price_cents_snapshot: Number(pack.price_cents_snapshot || 0),
        item_count: Number(pack.item_count || 0),
      })),
    );
    setIsLoading(false);
  }

  if (isLoading) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-[#020711] text-sm text-white/54">
        Loading your premium packs...
      </main>
    );
  }

  if (hallAccess && !hallAccess.canAccess) {
    return <CreatorClubsLockedScreen />;
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#020711] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.13),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.07),transparent_30%),linear-gradient(180deg,#041124_0%,#020711_100%)]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <header className="shrink-0 p-4 sm:p-5">
          <div className="mx-auto flex max-w-[1180px] items-start justify-between gap-3">
            <div>
              <Link
                href="/milo-world/quiz-hall/communities"
                className="inline-flex min-h-[40px] items-center rounded-full border border-white/12 bg-white/[0.035] px-4 text-[9px] font-black uppercase tracking-[0.1em] text-white/54 no-underline"
              >
                ← Creator Clubs
              </Link>
              <p className="mt-5 text-[8px] font-black uppercase tracking-[0.17em] text-violet-100/62">
                Milo’s Quiz Hall
              </p>
              <h1 className="mt-1 font-serif text-[clamp(40px,6vw,68px)] font-normal leading-[0.94]">
                My Premium Packs
              </h1>
              <p className="mt-3 max-w-2xl text-xs leading-5 text-white/42">
                Packs unlocked on your Dreamscape account stay attached to your
                library. Phase 5 admin-test packs appear here exactly as future
                paid entitlements will.
              </p>
            </div>
          </div>
        </header>

        {errorMessage && (
          <p className="mx-auto mb-3 w-[calc(100%-32px)] max-w-[1148px] rounded-xl border border-red-200/13 bg-red-400/[0.06] px-3 py-2 text-[10px] text-red-100">
            {errorMessage}
          </p>
        )}

        <section className="dream-library-scroll mx-auto min-h-0 w-full max-w-[1180px] flex-1 overflow-y-auto px-4 pb-8 sm:px-5">
          {packs.length === 0 ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-white/9 bg-white/[0.035] p-8 text-center">
              <div className="max-w-lg">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-200/14 bg-violet-300/[0.05] text-2xl text-violet-100">
                  ◇
                </span>
                <h2 className="mt-5 text-2xl font-black">
                  No premium packs unlocked yet
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/40">
                  Published creator packs can be explored inside individual
                  Creator Clubs. Paid checkout is added in Phase 6.
                </p>
                <Link
                  href="/milo-world/quiz-hall/communities"
                  className="mt-6 inline-flex min-h-[44px] items-center rounded-full border border-violet-200/18 bg-violet-300/[0.07] px-5 text-[9px] font-black uppercase tracking-[0.1em] text-violet-100 no-underline"
                >
                  Browse Creator Clubs
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {packs.map((pack) => (
                <Link
                  key={pack.pack_id}
                  href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(
                    pack.club_slug,
                  )}/packs/${encodeURIComponent(pack.pack_slug)}`}
                  className="group relative min-h-[250px] overflow-hidden rounded-[26px] border border-violet-200/12 bg-white/[0.04] p-5 text-white no-underline shadow-[0_24px_70px_rgba(0,0,0,0.24)] transition hover:-translate-y-0.5 hover:border-violet-200/24"
                >
                  {pack.cover_image_url && (
                    <>
                      <img
                        src={pack.cover_image_url}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover opacity-15"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,18,0.30),rgba(3,7,18,0.94))]" />
                    </>
                  )}

                  <div className="relative z-10 flex h-full flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <span>
                        <p className="text-[8px] font-black uppercase tracking-[0.12em] text-violet-100/60">
                          {pack.item_count} quiz
                          {pack.item_count === 1 ? "" : "zes"}
                        </p>
                        <h2 className="mt-2 line-clamp-2 text-xl font-black leading-6">
                          {pack.title}
                        </h2>
                      </span>

                      <span className="rounded-full border border-emerald-200/14 bg-emerald-400/[0.07] px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.08em] text-emerald-100">
                        Owned
                      </span>
                    </div>

                    {pack.description && (
                      <p className="mt-3 line-clamp-3 text-[10px] leading-5 text-white/38">
                        {pack.description}
                      </p>
                    )}

                    <div className="mt-auto pt-5">
                      <p className="text-[9px] font-bold text-white/44">
                        {pack.club_name} · by {pack.creator_display_name}
                      </p>

                      <div className="mt-3 flex items-end justify-between gap-3 border-t border-white/7 pt-3">
                        <span>
                          <strong className="block text-base text-violet-100">
                            {money(pack.price_cents_snapshot)}
                          </strong>
                          <small className="text-[8px] text-white/28">
                            unlocked {formatDate(pack.granted_at)}
                          </small>
                        </span>

                        <span className="rounded-full border border-violet-200/16 bg-violet-300/[0.06] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.08em] text-violet-100">
                          Open →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        .dream-library-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(196, 181, 253, 0.30)
            rgba(255, 255, 255, 0.04);
        }
        .dream-library-scroll::-webkit-scrollbar {
          width: 7px;
        }
        .dream-library-scroll::-webkit-scrollbar-thumb {
          background: rgba(196, 181, 253, 0.30);
          border-radius: 999px;
        }
      `}</style>
    </main>
  );
}
