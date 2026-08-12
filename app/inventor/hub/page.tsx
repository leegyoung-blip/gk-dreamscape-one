"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type HomeArea = {
  id: "area-1" | "area-2" | "area-3";
  number: 1 | 2 | 3;
  title: string;
  shortLabel: string;
  description: string;
  image: string;
  dtCost: number;
  prerequisiteAreaId: HomeArea["id"] | null;
  ownedInPhase1: boolean;
};

const HOME_AREAS: HomeArea[] = [
  {
    id: "area-1",
    number: 1,
    title: "Area 1",
    shortLabel: "Starter Area",
    description:
      "Nova’s first home space. This is the area we will fully design in Phase 2.",
    image: "/activities/nova-home/area-1-placeholder.png",
    dtCost: 0,
    prerequisiteAreaId: null,
    ownedInPhase1: true,
  },
  {
    id: "area-2",
    number: 2,
    title: "Area 2",
    shortLabel: "Home Expansion",
    description:
      "A connected expansion that will unlock after Area 1 and be purchased with Dream Tokens.",
    image: "/activities/nova-home/area-2-placeholder.png",
    dtCost: 1500,
    prerequisiteAreaId: "area-1",
    ownedInPhase1: false,
  },
  {
    id: "area-3",
    number: 3,
    title: "Area 3",
    shortLabel: "Final Expansion",
    description:
      "The third connected space. It remains locked until the previous expansion has been acquired.",
    image: "/activities/nova-home/area-3-placeholder.png",
    dtCost: 3000,
    prerequisiteAreaId: "area-2",
    ownedInPhase1: false,
  },
];

function formatDT(value: number) {
  return `${Math.round(Number(value || 0)).toLocaleString("en-SG")} DT`;
}

export default function NovaHomePage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [dreamTokenBalance, setDreamTokenBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [selectedAreaId, setSelectedAreaId] =
    useState<HomeArea["id"]>("area-1");
  const [showInfo, setShowInfo] = useState(false);

  const selectedArea = useMemo(
    () => HOME_AREAS.find((area) => area.id === selectedAreaId) ?? HOME_AREAS[0],
    [selectedAreaId],
  );

  useEffect(() => {
    let mounted = true;

    async function loadAdminPreview() {
      setBalanceLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        setAuthChecked(true);
        setIsAdmin(false);
        router.replace("/login");
        return;
      }

      setUserEmail(user.email ?? null);

      const [profileResult, balanceResult] = await Promise.all([
        supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
        supabase
          .from("dream_token_transactions")
          .select("amount")
          .eq("user_id", user.id)
          .eq("token_kind", "virtual"),
      ]);

      if (!mounted) return;

      const role = String(profileResult.data?.role || "")
        .trim()
        .toLowerCase();
      const admin = role === "admin";

      setIsAdmin(admin);
      setAuthChecked(true);

      if (!admin) {
        router.replace("/inventor");
        return;
      }

      if (balanceResult.error) {
        console.warn(
          "Could not load Dream Token balance for Nova's Home:",
          balanceResult.error.message,
        );
        setDreamTokenBalance(0);
      } else {
        const total = (balanceResult.data || []).reduce(
          (sum, row) => sum + Number(row.amount || 0),
          0,
        );
        setDreamTokenBalance(total);
      }

      setBalanceLoading(false);
    }

    loadAdminPreview();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadAdminPreview();
    });

    function refreshBalance() {
      loadAdminPreview();
    }

    window.addEventListener("focus", refreshBalance);
    window.addEventListener("dream-tokens-updated", refreshBalance);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener("focus", refreshBalance);
      window.removeEventListener("dream-tokens-updated", refreshBalance);
    };
  }, [router]);

  if (!authChecked || !isAdmin) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#020713] px-6 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-full border border-cyan-300/50 bg-cyan-300/10 shadow-[0_0_28px_rgba(83,215,255,0.28)]" />
          <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-cyan-200/70">
            Checking Nova Home access
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#020713] text-white">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(39,145,190,0.16),transparent_38%),linear-gradient(180deg,#04101d_0%,#020713_72%)]" />

      <header className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => router.push("/inventor")}
          className="flex h-11 items-center gap-2 rounded-full border border-cyan-200/35 bg-slate-950/65 px-4 text-xs font-black uppercase tracking-[0.1em] text-white shadow-[0_14px_34px_rgba(0,0,0,0.28)] backdrop-blur-xl hover:bg-cyan-300/10"
        >
          <span aria-hidden="true">←</span>
          Nova’s World
        </button>

        <div className="flex items-center gap-2">
          <div className="rounded-full border border-cyan-200/30 bg-slate-950/70 px-4 py-2 text-right shadow-[0_14px_34px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-cyan-200/55">
              Dream Tokens
            </p>
            <p className="mt-0.5 text-sm font-black text-cyan-50">
              {balanceLoading ? "Loading..." : formatDT(dreamTokenBalance)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowInfo(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] text-lg font-black text-white backdrop-blur-xl hover:bg-white/[0.1]"
            aria-label="About Nova's Home preview"
          >
            i
          </button>
        </div>
      </header>

      <section className="relative z-10 mx-auto w-full max-w-[1500px] px-4 pb-12 sm:px-6 lg:px-8">
        <div className="pt-4 text-center sm:pt-6">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300 sm:text-xs">
            Admin Development Preview
          </p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
            Nova’s Home
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/62 sm:text-base">
            Build Nova’s connected home over time. Area 1 is the starting space;
            future areas expand the same home and become meaningful Dream Token sinks.
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-[28px] border border-cyan-200/18 bg-white/[0.035] shadow-[0_30px_90px_rgba(0,0,0,0.42)] sm:mt-10">
          <div className="relative aspect-[16/9] min-h-[360px] w-full bg-[#06101c] sm:min-h-[500px] lg:min-h-[620px]">
            <img
              key={selectedArea.image}
              src={selectedArea.image}
              alt={`${selectedArea.title} isometric placeholder`}
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />

            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/65" />

            <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-slate-950/68 px-3 py-2 text-[10px] font-black uppercase tracking-[0.13em] text-white/78 backdrop-blur-xl sm:left-6 sm:top-6 sm:px-4 sm:text-xs">
              Isometric placeholder · Phase 1
            </div>

            {!selectedArea.ownedInPhase1 && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/28 backdrop-blur-[1px]">
                <div className="rounded-[24px] border border-amber-200/32 bg-slate-950/78 px-6 py-5 text-center shadow-[0_24px_70px_rgba(0,0,0,0.48)] backdrop-blur-xl">
                  <div className="text-3xl">🔒</div>
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-amber-100/70">
                    Expansion Locked
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {formatDT(selectedArea.dtCost)}
                  </p>
                  <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-white/48">
                    Purchase wiring will be connected to a secure ownership ledger after the visual review.
                  </p>
                </div>
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-6">
              <div className="max-w-xl rounded-[20px] border border-white/12 bg-slate-950/62 p-4 backdrop-blur-xl sm:p-5">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-cyan-100">
                    {selectedArea.ownedInPhase1 ? "Owned" : "Preview Locked"}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.13em] text-white/36">
                    {selectedArea.shortLabel}
                  </span>
                </div>
                <h2 className="mt-3 text-2xl font-black sm:text-3xl">
                  {selectedArea.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/62">
                  {selectedArea.description}
                </p>
              </div>

              {!selectedArea.ownedInPhase1 && (
                <button
                  type="button"
                  disabled
                  className="min-h-12 rounded-full border border-white/12 bg-white/[0.06] px-6 text-xs font-black uppercase tracking-[0.12em] text-white/34"
                >
                  Unlock for {formatDT(selectedArea.dtCost)}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.025] p-4 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200/60">
                Home Expansion Path
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                Three connected areas
              </h2>
            </div>
            <p className="max-w-xl text-xs leading-5 text-white/46 sm:text-right">
              Area 2 connects directly to Area 1. Area 3 continues from Area 2, so the home grows as one continuous environment rather than separate rooms in a menu.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-0 lg:grid-cols-[1fr_64px_1fr_64px_1fr] lg:items-stretch">
            {HOME_AREAS.map((area, index) => {
              const active = selectedAreaId === area.id;
              const affordable = dreamTokenBalance >= area.dtCost;

              return (
                <div key={area.id} className="contents">
                  <button
                    type="button"
                    onClick={() => setSelectedAreaId(area.id)}
                    className={`group overflow-hidden rounded-[22px] border text-left transition ${
                      active
                        ? "border-cyan-200/65 bg-cyan-300/[0.08] shadow-[0_0_32px_rgba(83,215,255,0.16)]"
                        : area.ownedInPhase1
                          ? "border-white/12 bg-white/[0.035] hover:border-cyan-200/32"
                          : "border-amber-200/18 bg-amber-300/[0.025] hover:border-amber-200/32"
                    }`}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-[#06101c]">
                      <img
                        src={area.image}
                        alt=""
                        className={`h-full w-full object-cover transition duration-300 group-hover:scale-[1.02] ${
                          area.ownedInPhase1 ? "" : "brightness-[0.58] saturate-[0.7]"
                        }`}
                        draggable={false}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/76 via-transparent to-transparent" />

                      <div className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/18 bg-slate-950/70 text-xs font-black">
                        {area.number}
                      </div>

                      {!area.ownedInPhase1 && (
                        <div className="absolute right-3 top-3 rounded-full border border-amber-200/28 bg-slate-950/72 px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-100">
                          🔒 {formatDT(area.dtCost)}
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/36">
                            {area.shortLabel}
                          </p>
                          <h3 className="mt-1 text-lg font-black text-white">
                            {area.title}
                          </h3>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] ${
                            area.ownedInPhase1
                              ? "border border-emerald-200/24 bg-emerald-300/10 text-emerald-100"
                              : affordable
                                ? "border border-cyan-200/24 bg-cyan-300/10 text-cyan-100"
                                : "border border-white/10 bg-white/[0.04] text-white/36"
                          }`}
                        >
                          {area.ownedInPhase1
                            ? "Owned"
                            : affordable
                              ? "Affordable"
                              : "Save DT"}
                        </span>
                      </div>
                    </div>
                  </button>

                  {index < HOME_AREAS.length - 1 && (
                    <div className="flex min-h-12 items-center justify-center lg:min-h-0">
                      <div className="relative flex h-12 w-12 items-center justify-center lg:h-full lg:w-16">
                        <span className="absolute h-8 w-px bg-gradient-to-b from-cyan-200/5 via-cyan-200/46 to-cyan-200/5 lg:h-px lg:w-12 lg:bg-gradient-to-r" />
                        <span className="relative flex h-7 w-7 rotate-90 items-center justify-center rounded-full border border-cyan-200/24 bg-[#071525] text-sm text-cyan-100/72 lg:rotate-0">
                          →
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-[22px] border border-cyan-200/12 bg-cyan-300/[0.035] p-4 text-xs leading-5 text-white/52 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p>
            <strong className="text-cyan-100">Phase 1 boundary:</strong> visual shell, admin gate, connected expansion order, placeholder isometric assets, and DT pricing structure.
          </p>
          <p className="shrink-0 text-white/36">
            Signed in as {userEmail || "admin"}
          </p>
        </div>
      </section>

      {showInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md"
          onClick={() => setShowInfo(false)}
        >
          <section
            className="relative w-full max-w-xl rounded-[28px] border border-cyan-200/30 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-6 text-white shadow-[0_30px_90px_rgba(0,0,0,0.62)] sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowInfo(false)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] text-xl"
            >
              ×
            </button>

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200/65">
              Phase 1 Preview
            </p>
            <h2 className="mt-3 text-3xl font-black">Nova’s Home foundation</h2>
            <div className="mt-5 grid gap-3 text-sm leading-6 text-white/65">
              <p>Area 1 is owned from the start.</p>
              <p>Area 2 requires Area 1 and will cost Dream Tokens.</p>
              <p>Area 3 requires Area 2 and will cost more Dream Tokens.</p>
              <p>
                Real purchase/debit logic is intentionally not active until a secure Nova-home ownership record and server-side purchase function are added.
              </p>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
