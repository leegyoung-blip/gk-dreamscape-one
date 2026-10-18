"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { TrafficReport } from "@/lib/analytics/vercel";

type TrafficOverviewState =
  | { status: "loading" }
  | { status: "error"; detail: string }
  | { status: "loaded"; report: TrafficReport };

function metric(value: number): string {
  return value.toLocaleString("en-SG");
}

export default function SiteTrafficOverviewCard({
  onOpen,
}: {
  onOpen: () => void;
}) {
  const [state, setState] = useState<TrafficOverviewState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    async function loadTraffic() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (controller.signal.aborted) return;
        if (sessionError || !session?.access_token) {
          throw new Error("Admin session unavailable.");
        }

        const response = await fetch("/api/admin/site-analytics?range=7d", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          signal: controller.signal,
          cache: "no-store",
        });

        const result: unknown = await response.json();
        if (controller.signal.aborted) return;

        const payload = result as {
          ok?: boolean;
          report?: TrafficReport;
          error?: string;
        };
        if (!response.ok || !payload.ok || !payload.report) {
          throw new Error(payload.error || "Analytics are unavailable.");
        }

        setState({ status: "loaded", report: payload.report });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          detail: error instanceof Error ? error.message : "Could not load traffic.",
        });
      }
    }

    void loadTraffic();
    return () => controller.abort();
  }, []);

  const lastDay =
    state.status === "loaded"
      ? state.report.daily[state.report.daily.length - 1]
      : undefined;

  return (
    <section className="rounded-[30px] border border-cyan-200/16 bg-[linear-gradient(135deg,rgba(8,63,87,0.24),rgba(4,20,48,0.88))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8dfcff]">
            Site Traffic Snapshot
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-white">
            Your visitors at a glance
          </h2>
          <p className="mt-2 text-xs text-white/45">
            Production traffic from Vercel · UTC reporting days
          </p>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="rounded-full border border-cyan-200/30 bg-cyan-300/10 px-5 py-3 text-xs font-extrabold uppercase tracking-[0.1em] text-cyan-100 transition hover:bg-cyan-300/18"
        >
          View Site Traffic →
        </button>
      </div>

      {state.status === "loading" ? (
        <p role="status" className="mt-5 text-sm text-white/50">Loading traffic summary…</p>
      ) : state.status === "error" ? (
        <p className="mt-5 text-sm leading-6 text-white/55">
          Traffic summary unavailable: {state.detail}
        </p>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs text-white/45">Visitors today (UTC)</p>
              <strong className="mt-2 block text-3xl tracking-[-0.04em] text-[#8dfcff]">
                {metric(lastDay?.visitors ?? 0)}
              </strong>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs text-white/45">Page views today (UTC)</p>
              <strong className="mt-2 block text-3xl tracking-[-0.04em] text-violet-200">
                {metric(lastDay?.pageviews ?? 0)}
              </strong>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs text-white/45">Daily visitors · past 7 days</p>
              <strong className="mt-2 block text-3xl tracking-[-0.04em] text-white">
                {metric(state.report.totalVisitors)}
              </strong>
            </div>
          </div>
          <p className="mt-4 text-xs leading-5 text-white/35">
            Seven-day visitors are the sum of each day’s unique visitors, not
            unique individuals across the entire week. Statistics are not live
            concurrent-user counts.
          </p>
        </>
      )}
    </section>
  );
}
