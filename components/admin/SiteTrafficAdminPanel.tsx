"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { DailyTraffic, TrafficDimension, TrafficRange, TrafficReport } from "@/lib/analytics/vercel";

const PERIODS: { key: TrafficRange; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
];

const fmt = (value: number) => value.toLocaleString("en-SG");

function humanCountry(code: string): string {
  if (code === "Others" || code.startsWith("Unknown")) return code;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}

function displayReferrer(value: string): string {
  if (!value || value === "(none)" || value === "null") return "Direct / unknown";
  return value;
}

function TrafficCard({ title, value, detail, tone = "cyan" }: {
  title: string;
  value: string;
  detail: string;
  tone?: "cyan" | "violet" | "pink";
}) {
  const hue = tone === "pink" ? "text-fuchsia-200" : tone === "violet" ? "text-violet-200" : "text-[#8dfcff]";
  return (
    <article className="min-w-0 rounded-3xl border border-cyan-200/15 bg-white/[.045] p-5 shadow-[0_20px_60px_rgba(0,0,0,.2)] backdrop-blur-xl">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-white/45">{title}</p>
      <strong className={`mt-3 block text-3xl tracking-[-.04em] sm:text-4xl ${hue}`}>{value}</strong>
      <p className="mt-2 text-xs leading-5 text-white/40">{detail}</p>
    </article>
  );
}

function DailyTrafficChart({ daily }: { daily: DailyTraffic[] }) {
  const [metric, setMetric] = useState<"visitors" | "pageviews">("visitors");
  const maximum = Math.max(1, ...daily.map((row) => row[metric]));
  const width = 780;
  const height = 226;
  const left = 42;
  const right = 12;
  const top = 16;
  const bottom = 42;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const points = daily.map((row, i) => {
    const x = left + (daily.length === 1 ? innerWidth / 2 : (i * innerWidth) / (daily.length - 1));
    const y = top + innerHeight - (row[metric] / maximum) * innerHeight;
    return { x, y, row };
  });
  const path = points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const labelStep = daily.length > 14 ? 5 : daily.length > 7 ? 3 : 1;
  return (
    <article className="rounded-[30px] border border-cyan-200/15 bg-[#061632]/60 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-200">Traffic Trend</p>
          <h2 className="mt-2 text-xl font-semibold">Daily activity</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["visitors", "pageviews"] as const).map((key) => (
            <button key={key} type="button" onClick={() => setMetric(key)} aria-pressed={metric === key}
              className={`rounded-full border px-4 py-2 text-xs font-bold transition ${metric === key ? "border-cyan-200/50 bg-cyan-300/15 text-cyan-100" : "border-white/10 bg-white/[.025] text-white/55 hover:text-white"}`}>
              {key === "visitors" ? "Visitors" : "Page Views"}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[330px] w-full" role="img" aria-label={`Daily ${metric} chart. ${daily.map((d) => `${d.date}: ${d[metric]}`).join(", ")}`}>
          {[0, .25, .5, .75, 1].map((f) => {
            const y = top + innerHeight * (1 - f);
            return <g key={f}><line x1={left} y1={y} x2={width - right} y2={y} stroke="white" strokeOpacity=".10" strokeDasharray="3 5" />
              <text x={left - 9} y={y + 4} fill="#b8c6d5" fillOpacity=".65" textAnchor="end" fontSize="11">{fmt(Math.round(maximum * f))}</text></g>;
          })}
          {points.length > 1 && (
            <path d={`${path} L ${points[points.length - 1].x},${top + innerHeight} L ${points[0].x},${top + innerHeight} Z`} fill="#22d3ee" fillOpacity=".09" />
          )}
          <path d={path} stroke="#67e8f9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          {points.map((p, i) => (
            <g key={`${p.row.date}-${i}`}>
              <circle cx={p.x} cy={p.y} r="3.5" fill="#67e8f9"><title>{p.row.date}: {fmt(p.row[metric])}</title></circle>
              {(i % labelStep === 0 || i === points.length - 1) && <text x={p.x} y={height - 17} textAnchor="middle" fill="#b8c6d5" fillOpacity=".75" fontSize="11">{p.row.date.slice(5)}</text>}
            </g>
          ))}
        </svg>
      </div>
    </article>
  );
}

function BreakdownCard({ title, rows, metric, formatLabel }: {
  title: string;
  rows: TrafficDimension[];
  metric: "visitors" | "pageviews";
  formatLabel?: (value: string) => string;
}) {
  const max = Math.max(1, ...rows.map((row) => row[metric]));
  return (
    <article className="min-w-0 rounded-[28px] border border-cyan-200/14 bg-white/[.04] p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="text-[11px] uppercase tracking-[.1em] text-white/35">{metric === "visitors" ? "Visitors" : "Page Views"}</span>
      </div>
      {rows.length === 0 ? <p className="py-7 text-sm text-white/45">No traffic recorded for this period.</p> : (
        <div className="space-y-4">
          {rows.slice(0, 10).map((row, i) => (
            <div key={`${row.label}-${i}`}>
              <div className="mb-2 flex items-baseline justify-between gap-4">
                <p className="min-w-0 break-all text-xs text-white/75" title={row.label}>{formatLabel ? formatLabel(row.label) : row.label}</p>
                <strong className="shrink-0 text-sm tabular-nums text-white">{fmt(row[metric])}</strong>
              </div>
              <div className="h-[5px] overflow-hidden rounded-full bg-white/[.08]">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-400" style={{ width: `${Math.max(0, (row[metric] / max) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export default function SiteTrafficAdminPanel() {
  const [range, setRange] = useState<TrafficRange>("7d");
  const [refreshKey, setRefreshKey] = useState(0);
  const [report, setReport] = useState<TrafficReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setIsLoading(true);
      setErrorMessage("");
      setReport(null);
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (controller.signal.aborted) return;
        if (sessionError || !session?.access_token) throw new Error("Please sign in as an administrator to view traffic.");
        const response = await fetch(`/api/admin/site-analytics?range=${range}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (controller.signal.aborted) return;
        const data = payload as { ok?: boolean; report?: TrafficReport; error?: string };
        if (!response.ok || !data.ok || !data.report) throw new Error(data.error || "Unable to load traffic.");
        setReport(data.report);
      } catch (error) {
        if (controller.signal.aborted) return;
        setErrorMessage(error instanceof Error ? error.message : "Unable to load traffic right now.");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [range, refreshKey]);

  const labels = useMemo(() => {
    if (!report) return null;
    const today = report.range === "today";
    return {
      headline: today ? "Today" : report.range === "7d" ? "Last 7 UTC days" : "Last 30 UTC days",
      period: today ? report.since : `${report.since} to ${report.until}`,
    };
  }, [report]);

  return (
    <section className="mt-6 space-y-6" aria-label="Site traffic statistics">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-cyan-200/14 bg-white/[.04] p-4 sm:p-5">
        <div>
          <p className="text-sm font-semibold text-white">Production Web Analytics</p>
          <p className="mt-1 text-xs text-white/40">Vercel aggregates · UTC dates · no simulated statistics</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((period) => (
            <button key={period.key} type="button" disabled={isLoading} aria-pressed={range === period.key}
              onClick={() => setRange(period.key)} className={`rounded-full border px-4 py-2 text-xs font-extrabold transition disabled:opacity-60 ${range === period.key ? "border-cyan-200/40 bg-cyan-300/14 text-cyan-100" : "border-white/10 bg-white/[.025] text-white/55 hover:text-white"}`}>
              {period.label}
            </button>
          ))}
          <button type="button" onClick={() => setRefreshKey((n) => n + 1)} disabled={isLoading}
            className="rounded-full border border-violet-200/25 bg-violet-300/[.08] px-4 py-2 text-xs font-extrabold text-violet-100 transition hover:bg-violet-300/15 disabled:opacity-50">
            {isLoading ? "Loading…" : "Refresh ↻"}
          </button>
        </div>
      </div>
      {isLoading && (
        <div className="rounded-3xl border border-cyan-200/15 bg-white/[.04] px-6 py-10 text-center text-sm text-white/60" role="status">Loading Vercel Analytics…</div>
      )}
      {!isLoading && errorMessage && (
        <div className="rounded-3xl border border-red-200/20 bg-red-400/[.08] px-6 py-6" role="alert">
          <p className="font-semibold text-red-100">Traffic data unavailable</p>
          <p className="mt-2 text-sm text-red-100/80">{errorMessage}</p>
          <p className="mt-3 text-xs text-white/50">If setup is incomplete, configure VERCEL_ANALYTICS_TOKEN and VERCEL_ANALYTICS_PROJECT_ID in Vercel, plus your team ID or slug if this is a team project. New environment variables require a redeployment.</p>
        </div>
      )}
      {!isLoading && report && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TrafficCard title="Daily Unique Visitors" value={fmt(report.totalVisitors)} detail={report.range === "today" ? "Unique visitors today (UTC)" : "Sum of unique visitors per UTC day — not distinct people across the full period"} />
            <TrafficCard title="Page Views" value={fmt(report.totalPageviews)} detail={`Total pages viewed · ${labels?.headline}`} tone="violet" />
            <TrafficCard title="Pages per Visitor" value={report.totalVisitors ? (report.totalPageviews / report.totalVisitors).toFixed(2) : "—"} detail="Page views divided by summed daily unique visitors" tone="pink" />
            <TrafficCard title="Report Period" value={report.range === "today" ? "Today" : report.range === "7d" ? "7 days" : "30 days"} detail={labels?.period || ""} />
          </div>
          {report.totalPageviews === 0 && <p className="rounded-2xl border border-cyan-200/12 bg-cyan-300/[.04] px-5 py-4 text-xs leading-5 text-white/60">No page views were returned for this period. Vercel Web Analytics only reports visits recorded after its tracking script was deployed; older visits are not backfilled.</p>}
          <DailyTrafficChart daily={report.daily} />
          <div className="grid gap-5 lg:grid-cols-2">
            <BreakdownCard title="Top Pages" rows={report.pages} metric="pageviews" />
            <BreakdownCard title="Traffic Sources" rows={report.referrers} metric="pageviews" formatLabel={displayReferrer} />
            <BreakdownCard title="Visitor Countries" rows={report.countries} metric="visitors" formatLabel={humanCountry} />
            <BreakdownCard title="Devices" rows={report.devices} metric="visitors" />
            <BreakdownCard title="Browsers" rows={report.browsers} metric="visitors" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/15 px-5 py-4 text-xs leading-5 text-white/45">
            <span>Last checked: {new Date(report.updatedAt).toLocaleString("en-SG", { timeZone: "Asia/Singapore", dateStyle: "medium", timeStyle: "short" })} SGT · Production only · UTC reporting days</span>
            <span>Vercel Web Analytics does not identify currently signed-in learners. Live presence is a separate future feature.</span>
          </div>
        </>
      )}
    </section>
  );
}
