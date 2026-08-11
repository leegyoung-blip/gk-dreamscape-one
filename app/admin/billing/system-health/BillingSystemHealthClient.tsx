"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import BillingAdminShell from "@/app/admin/billing/_components/BillingAdminShell";
import { supabase } from "@/lib/supabase";

type HealthCheck = {
  category: string;
  check_key: string;
  severity: "ok" | "warning" | "error" | string;
  status: string;
  count_value: number | string | null;
  detail: string | null;
};

type SecurityRow = {
  table_name: string;
  table_exists: boolean;
  rls_enabled: boolean;
  rls_forced: boolean;
};

type WebhookRow = {
  scope: string;
  environment: string | null;
  last_received_at: string | null;
  last_processed_at: string | null;
  events_24h: number | string;
  failed_24h: number | string;
  stale_received: number | string;
};

type RuntimeConfig = {
  siteUrlPresent: boolean;
  supabaseUrlPresent: boolean;
  supabaseServiceRolePresent: boolean;
  hitpayEnvironmentExplicit: boolean;
  hitpayEnvironment: string;
  hitpayApiKeyPresent: boolean;
  dreamscapeWebhookSaltPresent: boolean;
  billingWebhookSaltPresent: boolean;
  resendApiKeyPresent: boolean;
};

type HealthPayload = {
  ok?: boolean;
  error?: string;
  checkedAt?: string;
  health?: HealthCheck[];
  security?: SecurityRow[];
  webhooks?: WebhookRow[];
  config?: RuntimeConfig;
};

function count(value: number | string | null | undefined) {
  return Number(value || 0);
}

function dateTime(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export default function BillingSystemHealthClient() {
  const [payload, setPayload] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setPayload(null);
        setError("Your billing session is missing. Use the Log in button at the top right.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/billing/system-health", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const result = (await response.json().catch(() => null)) as
        | HealthPayload
        | null;

      if (!response.ok) {
        throw new Error(result?.error || "Could not load billing system health.");
      }

      setPayload(result || {});
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not load billing system health.",
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const health = payload?.health || [];
  const blockers = health.filter((row) => row.severity === "error");
  const warnings = health.filter((row) => row.severity === "warning");
  const passed = health.filter((row) => row.severity === "ok");

  const configRows = useMemo(() => {
    const config = payload?.config;
    if (!config) return [];

    return [
      ["Site URL", config.siteUrlPresent, "NEXT_PUBLIC_SITE_URL"],
      ["Supabase URL", config.supabaseUrlPresent, "Supabase project URL"],
      ["Supabase service role", config.supabaseServiceRolePresent, "Server-only service role key"],
      ["HitPay environment", config.hitpayEnvironmentExplicit, config.hitpayEnvironment],
      ["HitPay API key", config.hitpayApiKeyPresent, `${config.hitpayEnvironment} server key`],
      ["Dreamscape webhook salt", config.dreamscapeWebhookSaltPresent, `${config.hitpayEnvironment} dedicated salt`],
      ["GKP billing webhook salt", config.billingWebhookSaltPresent, `${config.hitpayEnvironment} billing salt`],
      ["Resend API key", config.resendApiKeyPresent, "Subscription and billing email delivery"],
    ] as Array<[string, boolean, string]>;
  }, [payload]);

  const configMissing = configRows.filter(([, ready]) => !ready).length;
  const rlsMissing = (payload?.security || []).filter(
    (row) => row.table_exists && !row.rls_enabled,
  ).length;

  return (
    <BillingAdminShell
      eyebrow="Production hardening"
      title="Billing System Health"
      description="Launch readiness, security posture, webhook processing and stale-record monitoring for GKP Billing and Dreamscape subscriptions."
      actions={
        <>
          <Link
            href="/admin/billing"
            className="inline-flex min-h-11 items-center rounded-full border border-[#d7c9ae] bg-white px-4 text-xs font-bold text-[#554d40]"
          >
            Billing overview
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex min-h-11 items-center rounded-full bg-[#15233b] px-5 text-xs font-bold text-white disabled:opacity-60"
          >
            {loading ? "Checking…" : "Run health check"}
          </button>
        </>
      }
    >
      {error ? (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Blockers" value={loading ? "…" : String(blockers.length)} tone="error" />
        <Metric label="Warnings" value={loading ? "…" : String(warnings.length)} tone="warning" />
        <Metric label="Passed checks" value={loading ? "…" : String(passed.length)} tone="ok" />
        <Metric label="Missing config" value={loading ? "…" : String(configMissing)} tone={configMissing ? "error" : "ok"} />
        <Metric label="RLS gaps" value={loading ? "…" : String(rlsMissing)} tone={rlsMissing ? "error" : "ok"} />
      </section>

      <section className="mt-6 rounded-[28px] border border-[#ded5c4] bg-white p-6 shadow-[0_20px_60px_rgba(21,35,59,0.05)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">Launch gate</p>
            <h2 className="mt-2 text-xl font-semibold text-[#15233b]">
              {blockers.length === 0 && configMissing === 0
                ? "No current launch blockers"
                : "Action required before launch"}
            </h2>
          </div>
          <span className="text-xs text-[#81796d]">Checked {dateTime(payload?.checkedAt)}</span>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {health.map((row) => (
            <HealthCard key={row.check_key} row={row} />
          ))}
          {!loading && health.length === 0 ? (
            <p className="rounded-2xl bg-[#fbfaf7] p-5 text-sm text-[#81796d]">No health rows were returned.</p>
          ) : null}
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-[#ded5c4] bg-white p-6 shadow-[0_20px_60px_rgba(21,35,59,0.05)]">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">Runtime configuration</p>
        <h2 className="mt-2 text-xl font-semibold text-[#15233b]">Required server configuration</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#81796d]">
          Only presence checks are returned here. Secret values are never sent to the browser.
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#ebe5da] bg-[#fbfaf7] text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]">
                <th className="px-4 py-3">Setting</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {configRows.map(([label, ready, detail]) => (
                <tr key={label} className="border-b border-[#f0ece4] last:border-0">
                  <td className="px-4 py-4 text-sm font-bold text-[#15233b]">{label}</td>
                  <td className="px-4 py-4"><Status ready={ready} /></td>
                  <td className="px-4 py-4 text-sm text-[#81796d]">{detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-[#ded5c4] bg-white p-6 shadow-[0_20px_60px_rgba(21,35,59,0.05)]">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">Webhook health</p>
        <h2 className="mt-2 text-xl font-semibold text-[#15233b]">Provider event processing</h2>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#ebe5da] bg-[#fbfaf7] text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]">
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Environment</th>
                <th className="px-4 py-3">Last received</th>
                <th className="px-4 py-3">24h events</th>
                <th className="px-4 py-3">24h failed</th>
                <th className="px-4 py-3">Stale</th>
              </tr>
            </thead>
            <tbody>
              {(payload?.webhooks || []).map((row) => (
                <tr key={`${row.scope}:${row.environment || "none"}`} className="border-b border-[#f0ece4] last:border-0">
                  <td className="px-4 py-4 text-sm font-bold">{row.scope}</td>
                  <td className="px-4 py-4 text-sm">{row.environment || "—"}</td>
                  <td className="px-4 py-4 text-sm">{dateTime(row.last_received_at)}</td>
                  <td className="px-4 py-4 text-sm">{count(row.events_24h)}</td>
                  <td className="px-4 py-4 text-sm">{count(row.failed_24h)}</td>
                  <td className="px-4 py-4 text-sm">{count(row.stale_received)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-[#ded5c4] bg-white p-6 shadow-[0_20px_60px_rgba(21,35,59,0.05)]">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">Database security</p>
        <h2 className="mt-2 text-xl font-semibold text-[#15233b]">Sensitive-table RLS posture</h2>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {(payload?.security || []).map((row) => (
            <div key={row.table_name} className="rounded-2xl border border-[#ebe5da] bg-[#fbfaf7] p-4">
              <strong className="block break-all text-xs text-[#15233b]">{row.table_name}</strong>
              <p className="mt-2 text-xs text-[#81796d]">
                {!row.table_exists ? "Table missing" : row.rls_enabled ? "RLS enabled" : "RLS NOT enabled"}
              </p>
            </div>
          ))}
        </div>
      </section>
    </BillingAdminShell>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "warning" | "error";
}) {
  const className =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div className={`rounded-3xl border p-5 ${className}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.13em] opacity-75">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function HealthCard({ row }: { row: HealthCheck }) {
  const className =
    row.severity === "error"
      ? "border-red-200 bg-red-50"
      : row.severity === "warning"
        ? "border-amber-200 bg-amber-50"
        : "border-emerald-200 bg-emerald-50";

  return (
    <div className={`rounded-2xl border p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] opacity-60">{row.category}</p>
          <strong className="mt-1 block text-sm text-[#15233b]">{row.status}</strong>
        </div>
        <span className="rounded-full border border-black/10 bg-white/60 px-2.5 py-1 text-[10px] font-black uppercase">
          {row.severity}
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#6f675c]">{row.detail || "—"}</p>
      <p className="mt-2 text-[11px] font-bold text-[#81796d]">Count: {count(row.count_value)}</p>
    </div>
  );
}

function Status({ ready }: { ready: boolean }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase ${
      ready
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-red-200 bg-red-50 text-red-700"
    }`}>
      {ready ? "Ready" : "Missing"}
    </span>
  );
}
