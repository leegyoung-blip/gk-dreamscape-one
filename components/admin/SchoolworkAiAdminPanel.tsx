"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabase";

type Settings = {
  id: number;
  enabled: boolean;
  max_file_size_mb: number;
  max_pages: number;
  max_questions: number;
  daily_upload_limit: number;
  automatic_retry_count: number;
  extraction_model: string;
  reasoning_model: string;
  fallback_enabled: boolean;
  fallback_model: string;
  warning_failure_rate_pct: number;
  warning_average_latency_seconds: number;
  warning_average_cost_usd: number;
  updated_at: string;
};

type Health = {
  window_days: number;
  environment: {
    openai_api_key_configured: boolean;
  };
  runs: number;
  succeeded: number;
  failed: number;
  needs_input: number;
  success_rate: number | null;
  failure_rate: number | null;
  average_duration_seconds: number | null;
  total_estimated_cost_usd: number;
  average_estimated_cost_usd: number | null;
  questions_analysed: number;
  automatic_retries: number;
  failure_reasons: Array<{
    code: string;
    count: number;
  }>;
  warnings: string[];
  recent_failures: Array<{
    id: string;
    upload_id: string;
    run_number: number;
    status: string;
    error_code: string | null;
    error_message: string | null;
    started_at: string;
    completed_at: string | null;
    duration_ms: number | null;
  }>;
};

const inputClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-cyan-200/14 bg-[#061632] px-4 text-sm text-white outline-none transition focus:border-cyan-200/45";

function dateTime(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function numberLabel(
  value: number | null | undefined,
  suffix = "",
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  return `${Number(value).toLocaleString(
    "en-SG",
    {
      maximumFractionDigits: 1,
    },
  )}${suffix}`;
}

export default function SchoolworkAiAdminPanel() {
  const [settings, setSettings] =
    useState<Settings | null>(null);

  const [health, setHealth] =
    useState<Health | null>(null);

  const [days, setDays] =
    useState(7);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [keyConfigured, setKeyConfigured] =
    useState(false);

  const authedFetch = useCallback(
    async (
      url: string,
      init?: RequestInit,
    ) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Please sign in again.",
        );
      }

      const response = await fetch(url, {
        ...init,
        headers: {
          ...(init?.headers || {}),
          Authorization:
            `Bearer ${session.access_token}`,
        },
      });

      const body =
        await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.error ||
            "Schoolwork AI request failed.",
        );
      }

      return body;
    },
    [],
  );

  const load = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const [
          settingsBody,
          healthBody,
        ] = await Promise.all([
          authedFetch(
            "/api/admin/schoolwork-ai/settings",
          ),
          authedFetch(
            `/api/nova-plus/schoolwork/health?days=${days}`,
          ),
        ]);

        setSettings(
          settingsBody.settings as Settings,
        );

        setKeyConfigured(
          Boolean(
            settingsBody.environment
              ?.openai_api_key_configured,
          ),
        );

        setHealth(
          healthBody as Health,
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : String(loadError),
        );
      } finally {
        setLoading(false);
      }
    },
    [authedFetch, days],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const systemStatus =
    useMemo(() => {
      if (!keyConfigured) {
        return {
          label: "API key missing",
          className:
            "border-red-200/25 bg-red-400/10 text-red-100",
        };
      }

      if (!settings?.enabled) {
        return {
          label: "Paused",
          className:
            "border-amber-200/25 bg-amber-300/10 text-amber-100",
        };
      }

      if (
        (health?.warnings?.length || 0) > 0
      ) {
        return {
          label: "Needs attention",
          className:
            "border-amber-200/25 bg-amber-300/10 text-amber-100",
        };
      }

      return {
        label: "Operational",
        className:
          "border-emerald-200/25 bg-emerald-300/10 text-emerald-100",
      };
    }, [
      health?.warnings?.length,
      keyConfigured,
      settings?.enabled,
    ]);

  function update<K extends keyof Settings>(
    key: K,
    value: Settings[K],
  ) {
    setSettings((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    );
  }

  async function save() {
    if (!settings) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const body = await authedFetch(
        "/api/admin/schoolwork-ai/settings",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            enabled: settings.enabled,
            max_file_size_mb:
              Number(settings.max_file_size_mb),
            max_pages:
              Number(settings.max_pages),
            max_questions:
              Number(settings.max_questions),
            daily_upload_limit:
              Number(settings.daily_upload_limit),
            automatic_retry_count:
              Number(settings.automatic_retry_count),
            extraction_model:
              settings.extraction_model,
            reasoning_model:
              settings.reasoning_model,
            fallback_enabled:
              settings.fallback_enabled,
            fallback_model:
              settings.fallback_model,
            warning_failure_rate_pct:
              Number(
                settings.warning_failure_rate_pct,
              ),
            warning_average_latency_seconds:
              Number(
                settings.warning_average_latency_seconds,
              ),
            warning_average_cost_usd:
              Number(
                settings.warning_average_cost_usd,
              ),
          }),
        },
      );

      setSettings(
        body.settings as Settings,
      );

      setMessage(
        "Schoolwork AI settings saved.",
      );

      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : String(saveError),
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading && !settings) {
    return (
      <section className="mt-8 rounded-[32px] border border-cyan-200/18 bg-white/[0.045] p-7 text-white/55">
        Loading Schoolwork AI health…
      </section>
    );
  }

  return (
    <div className="mt-8 grid gap-6">
      <section className="rounded-[32px] border border-violet-200/18 bg-[linear-gradient(145deg,rgba(88,48,160,.12),rgba(4,20,48,.86))] p-6 shadow-[0_24px_70px_rgba(0,0,0,.26)] backdrop-blur-xl sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-[#cbb2ff]">
              NOVA+ SCHOOLWORK
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl">
              Schoolwork AI
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">
              Control live worksheet analysis, monitor reliability and keep
              model usage within production guardrails.
            </p>
          </div>

          <span
            className={`w-fit rounded-full border px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] ${systemStatus.className}`}
          >
            {systemStatus.label}
          </span>
        </div>

        {!keyConfigured && (
          <div className="mt-6 rounded-2xl border border-red-200/18 bg-red-400/8 px-5 py-4">
            <p className="text-sm font-bold text-red-100">
              OPENAI_API_KEY is not configured.
            </p>
            <p className="mt-2 text-xs leading-5 text-red-100/65">
              Add the server-only OPENAI_API_KEY environment variable in
              Vercel, then redeploy before testing live worksheet analysis.
            </p>
          </div>
        )}

        {health?.warnings?.map(
          (warning) => (
            <div
              key={warning}
              className="mt-3 rounded-2xl border border-amber-200/15 bg-amber-300/[0.06] px-5 py-3 text-sm text-amber-100"
            >
              {warning}
            </div>
          ),
        )}

        {message && (
          <p className="mt-4 rounded-2xl border border-emerald-200/18 bg-emerald-300/8 px-5 py-3 text-sm text-emerald-100">
            {message}
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-2xl border border-red-200/18 bg-red-400/8 px-5 py-3 text-sm text-red-100">
            {error}
          </p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Success Rate"
          value={
            health?.success_rate === null ||
            health?.success_rate === undefined
              ? "—"
              : `${health.success_rate}%`
          }
          detail={`${health?.runs ?? 0} runs in ${days} days`}
        />

        <Metric
          label="Average Time"
          value={numberLabel(
            health?.average_duration_seconds,
            "s",
          )}
          detail={`${health?.questions_analysed ?? 0} questions analysed`}
        />

        <Metric
          label="Average Cost"
          value={
            health?.average_estimated_cost_usd ===
              null ||
            health?.average_estimated_cost_usd ===
              undefined
              ? "—"
              : `$${health.average_estimated_cost_usd.toFixed(
                  4,
                )}`
          }
          detail={`$${Number(
            health?.total_estimated_cost_usd || 0,
          ).toFixed(4)} total`}
        />

        <Metric
          label="Automatic Retries"
          value={numberLabel(
            health?.automatic_retries,
          )}
          detail={`${health?.failed ?? 0} failed · ${health?.needs_input ?? 0} needs input`}
        />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[1, 7, 30].map(
            (windowDays) => (
              <button
                key={windowDays}
                type="button"
                onClick={() =>
                  setDays(windowDays)
                }
                className={`rounded-full border px-4 py-2 text-xs font-extrabold ${
                  days === windowDays
                    ? "border-cyan-200/35 bg-cyan-300/10 text-[#8dfcff]"
                    : "border-white/10 bg-white/[0.03] text-white/45"
                }`}
              >
                {windowDays === 1
                  ? "Today"
                  : `${windowDays} Days`}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className="rounded-full border border-cyan-200/16 bg-white/[0.04] px-4 py-2 text-xs font-bold text-white/65"
        >
          Refresh Health
        </button>
      </div>

      {settings && (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
          <div className="rounded-[32px] border border-cyan-200/16 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8dfcff]">
                  Production Controls
                </p>
                <h3 className="mt-2 text-2xl font-bold">
                  Limits & kill switch
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  update(
                    "enabled",
                    !settings.enabled,
                  )
                }
                className={`rounded-full border px-4 py-2 text-xs font-extrabold uppercase tracking-[0.1em] ${
                  settings.enabled
                    ? "border-emerald-200/25 bg-emerald-300/10 text-emerald-100"
                    : "border-red-200/25 bg-red-400/10 text-red-100"
                }`}
              >
                {settings.enabled
                  ? "AI Enabled"
                  : "AI Paused"}
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <NumberField
                label="Max file size (MB)"
                value={settings.max_file_size_mb}
                min={1}
                max={50}
                onChange={(value) =>
                  update(
                    "max_file_size_mb",
                    value,
                  )
                }
              />

              <NumberField
                label="Max pages"
                value={settings.max_pages}
                min={1}
                max={50}
                onChange={(value) =>
                  update("max_pages", value)
                }
              />

              <NumberField
                label="Max questions"
                value={settings.max_questions}
                min={1}
                max={200}
                onChange={(value) =>
                  update(
                    "max_questions",
                    value,
                  )
                }
              />

              <NumberField
                label="Uploads per learner / 24h"
                value={settings.daily_upload_limit}
                min={1}
                max={100}
                onChange={(value) =>
                  update(
                    "daily_upload_limit",
                    value,
                  )
                }
              />

              <Field label="Automatic retries">
                <select
                  className={inputClass}
                  value={
                    settings.automatic_retry_count
                  }
                  onChange={(event) =>
                    update(
                      "automatic_retry_count",
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                >
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </Field>
            </div>
          </div>

          <div className="rounded-[32px] border border-violet-200/16 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#cbb2ff]">
              Model Configuration
            </p>

            <h3 className="mt-2 text-2xl font-bold">
              Analysis models
            </h3>

            <div className="mt-6 grid gap-4">
              <Field label="Extraction model">
                <input
                  className={inputClass}
                  value={
                    settings.extraction_model
                  }
                  onChange={(event) =>
                    update(
                      "extraction_model",
                      event.target.value,
                    )
                  }
                />
              </Field>

              <Field label="Reasoning model">
                <input
                  className={inputClass}
                  value={
                    settings.reasoning_model
                  }
                  onChange={(event) =>
                    update(
                      "reasoning_model",
                      event.target.value,
                    )
                  }
                />
              </Field>

              <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <div>
                  <span className="block text-sm font-semibold">
                    Model fallback
                  </span>
                  <small className="mt-1 block text-xs text-white/40">
                    Use one alternate model only after the normal retries fail.
                  </small>
                </div>

                <input
                  type="checkbox"
                  checked={
                    settings.fallback_enabled
                  }
                  onChange={(event) =>
                    update(
                      "fallback_enabled",
                      event.target.checked,
                    )
                  }
                />
              </label>

              <Field label="Fallback model">
                <input
                  className={inputClass}
                  value={
                    settings.fallback_model
                  }
                  disabled={
                    !settings.fallback_enabled
                  }
                  onChange={(event) =>
                    update(
                      "fallback_model",
                      event.target.value,
                    )
                  }
                />
              </Field>
            </div>
          </div>
        </section>
      )}

      {settings && (
        <section className="rounded-[32px] border border-amber-200/12 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">
            Health Warnings
          </p>

          <h3 className="mt-2 text-2xl font-bold">
            Alert thresholds
          </h3>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <NumberField
              label="Failure rate warning (%)"
              value={settings.warning_failure_rate_pct}
              min={0}
              max={100}
              step={0.1}
              onChange={(value) =>
                update(
                  "warning_failure_rate_pct",
                  value,
                )
              }
            />

            <NumberField
              label="Average latency warning (s)"
              value={settings.warning_average_latency_seconds}
              min={1}
              max={600}
              onChange={(value) =>
                update(
                  "warning_average_latency_seconds",
                  value,
                )
              }
            />

            <NumberField
              label="Average cost warning (USD)"
              value={settings.warning_average_cost_usd}
              min={0}
              max={10}
              step={0.01}
              onChange={(value) =>
                update(
                  "warning_average_cost_usd",
                  value,
                )
              }
            />
          </div>
        </section>
      )}

      <section className="rounded-[32px] border border-red-200/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-7">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-200">
              Recent Exceptions
            </p>

            <h3 className="mt-2 text-2xl font-bold">
              Failed / blocked analyses
            </h3>
          </div>

          <span className="text-xs text-white/35">
            Latest 12
          </span>
        </div>

        <div className="mt-5 grid gap-3">
          {!health?.recent_failures?.length ? (
            <div className="rounded-2xl border border-emerald-200/10 bg-emerald-300/[0.04] px-5 py-4 text-sm text-emerald-100/75">
              No recent failed or needs-input analyses.
            </div>
          ) : (
            health.recent_failures.map(
              (failure) => (
                <article
                  key={failure.id}
                  className="rounded-2xl border border-white/8 bg-black/15 px-5 py-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-red-200/12 bg-red-400/[0.06] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-red-100">
                          {failure.status}
                        </span>

                        <span className="text-xs font-bold text-white/70">
                          {failure.error_code ||
                            "UNKNOWN"}
                        </span>
                      </div>

                      <p className="mt-3 max-w-4xl text-sm leading-6 text-white/52">
                        {failure.error_message ||
                          "No error detail recorded."}
                      </p>

                      <p className="mt-2 break-all text-[11px] text-white/25">
                        Upload {failure.upload_id}
                      </p>
                    </div>

                    <div className="text-right text-xs text-white/34">
                      <p>
                        {dateTime(
                          failure.completed_at ||
                            failure.started_at,
                        )}
                      </p>
                      <p className="mt-1">
                        Run {failure.run_number}
                      </p>
                    </div>
                  </div>
                </article>
              ),
            )
          )}
        </div>
      </section>

      {health?.failure_reasons?.length ? (
        <section className="rounded-[32px] border border-white/8 bg-white/[0.035] p-6 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">
            Failure Breakdown
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {health.failure_reasons.map(
              (reason) => (
                <span
                  key={reason.code}
                  className="rounded-full border border-white/8 bg-black/15 px-4 py-2 text-xs text-white/55"
                >
                  {reason.code} ·{" "}
                  <b className="text-white">
                    {reason.count}
                  </b>
                </span>
              ),
            )}
          </div>
        </section>
      ) : null}

      <button
        type="button"
        disabled={!settings || saving}
        onClick={() => void save()}
        className="sticky bottom-4 z-10 ml-auto rounded-full border border-yellow-200/28 bg-yellow-200/14 px-6 py-4 text-sm font-extrabold uppercase tracking-[0.12em] text-[#ffe5a3] shadow-[0_18px_44px_rgba(0,0,0,.35)] backdrop-blur-xl disabled:opacity-40"
      >
        {saving
          ? "Saving…"
          : "Save Schoolwork AI Settings"}
      </button>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-3xl border border-cyan-200/12 bg-white/[0.04] p-5 shadow-[0_20px_55px_rgba(0,0,0,.2)]">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-white/38">
        {label}
      </p>

      <strong className="mt-3 block text-3xl tracking-[-0.04em]">
        {value}
      </strong>

      <small className="mt-2 block text-xs text-white/35">
        {detail}
      </small>
    </article>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.13em] text-white/42">
        {label}
      </span>
      {children}
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <input
        className={inputClass}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) =>
          onChange(
            Number(event.target.value),
          )
        }
      />
    </Field>
  );
}
