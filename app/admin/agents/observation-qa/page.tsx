"use client";

import {
  useState,
} from "react";

import {
  supabase,
} from "@/lib/supabase";

type QaPayload = {
  ok?: boolean;
  phase2D4Pass?: boolean;
  error?: string;
  failedChecks?: string[];
  checks?: Record<string, boolean>;
  snapshot?: {
    snapshotId?: string;
    runId?: string;
    persistedStatus?: string;
    observedAt?: string;
    sourceCount?: number;
    sourceKeys?: string[];
    missingSourceKeys?: string[];
    unexpectedSourceKeys?: string[];
  };
  safety?: {
    dreamTokens?: {
      before?: number;
      after?: number;
      changed?: boolean;
    };
    dreamGems?: {
      before?: number;
      after?: number;
      changed?: boolean;
    };
    actionRequests?: {
      before?: number;
      after?: number;
      changed?: boolean;
    };
    lifecycleStatus?: string;
    activeAgents?: number;
    executingOrSucceededActions?: number;
    settings?: {
      agents_enabled?: boolean;
      public_visibility_enabled?: boolean;
      leaderboard_visibility_enabled?: boolean;
      exchange_visibility_enabled?: boolean;
    };
  };
};

export default function AgentObservationQaPage() {
  const [
    agentCode,
    setAgentCode,
  ] =
    useState(
      "DSBOT-0001",
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      false,
    );

  const [
    result,
    setResult,
  ] =
    useState<
      QaPayload |
      null
    >(
      null,
    );

  async function runQa() {
    setLoading(
      true,
    );

    setResult(
      null,
    );

    try {
      const {
        data: {
          session,
        },
        error:
          sessionError,
      } =
        await supabase
          .auth
          .getSession();

      if (
        sessionError
      ) {
        throw sessionError;
      }

      if (
        !session
          ?.access_token
      ) {
        throw new Error(
          "Please sign in again as an administrator.",
        );
      }

      const response =
        await fetch(
          "/api/admin/agents/observation-qa",
          {
            method:
              "POST",

            headers: {
              Authorization:
                `Bearer ${session.access_token}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                agentCode:
                  agentCode
                    .trim()
                    .toUpperCase(),
              }),
          },
        );

      const payload =
        (
          await response
            .json()
            .catch(
              () => ({}),
            )
        ) as QaPayload;

      setResult(
        payload,
      );

    } catch (
      error
    ) {
      setResult({
        ok: false,

        phase2D4Pass:
          false,

        error:
          error instanceof Error
            ? error.message
            : "QA request failed.",
      });
    }

    setLoading(
      false,
    );
  }

  const passed =
    result
      ?.phase2D4Pass ===
    true;

  return (
    <main className="min-h-screen bg-[#050816] px-4 py-8 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl">
        <a
          href="/admin/agents"
          className="text-sm font-bold text-cyan-200 no-underline hover:text-white"
        >
          ← Agent Control Centre
        </a>

        <div className="mt-6 rounded-[30px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <p className="m-0 text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
            DREAMSCAPE Agent Framework
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
            Phase 2D.4 · Live Adapter QA
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/60">
            Runs one real read-only WorldObserverV2 capture and verifies all
            18 observation sources while proving that DT, DG, action requests,
            lifecycle state and engine safety settings remain unchanged.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              value={
                agentCode
              }
              onChange={(
                event,
              ) =>
                setAgentCode(
                  event
                    .target
                    .value,
                )
              }
              placeholder="DSBOT-0001"
              className="min-h-[48px] rounded-2xl border border-white/12 bg-black/25 px-4 text-sm font-bold uppercase tracking-[0.08em] text-white outline-none focus:border-cyan-200/60"
            />

            <button
              type="button"
              onClick={
                runQa
              }
              disabled={
                loading ||
                !agentCode.trim()
              }
              className="min-h-[48px] rounded-2xl border border-cyan-200/25 bg-cyan-300/10 px-6 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading
                ? "Running QA…"
                : "Run 18-Source QA"}
            </button>
          </div>
        </div>

        {result && (
          <div
            className={`mt-6 rounded-[30px] border p-6 sm:p-8 ${
              passed
                ? "border-emerald-300/25 bg-emerald-300/[0.07]"
                : "border-red-300/25 bg-red-300/[0.07]"
            }`}
          >
            <p className="m-0 text-xs font-black uppercase tracking-[0.18em] text-white/55">
              QA Result
            </p>

            <h2
              className={`mt-2 text-3xl font-black ${
                passed
                  ? "text-emerald-200"
                  : "text-red-200"
              }`}
            >
              {passed
                ? "PASS"
                : "NOT PASSED"}
            </h2>

            {result.error && (
              <p className="mt-4 rounded-2xl border border-red-300/20 bg-black/20 p-4 text-sm leading-6 text-red-100">
                {result.error}
              </p>
            )}

            {result.snapshot && (
              <>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <Metric
                    label="Snapshot sections"
                    value={
                      String(
                        result
                          .snapshot
                          .sourceCount ??
                        0,
                      )
                    }
                  />

                  <Metric
                    label="Run status"
                    value={
                      result
                        .snapshot
                        .persistedStatus ||
                      "—"
                    }
                  />

                  <Metric
                    label="Missing sources"
                    value={
                      String(
                        result
                          .snapshot
                          .missingSourceKeys
                          ?.length ??
                        0,
                      )
                    }
                  />
                </div>

                <div className="mt-6 rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-white/45">
                    Observed Sources
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(
                      result
                        .snapshot
                        .sourceKeys ||
                      []
                    ).map(
                      (
                        source,
                      ) => (
                        <span
                          key={
                            source
                          }
                          className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-bold text-white/70"
                        >
                          {
                            source
                          }
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </>
            )}

            {result.safety && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SafetyMetric
                  label="DT changed"
                  unsafe={
                    Boolean(
                      result
                        .safety
                        .dreamTokens
                        ?.changed,
                    )
                  }
                />

                <SafetyMetric
                  label="DG changed"
                  unsafe={
                    Boolean(
                      result
                        .safety
                        .dreamGems
                        ?.changed,
                    )
                  }
                />

                <SafetyMetric
                  label="Action requests changed"
                  unsafe={
                    Boolean(
                      result
                        .safety
                        .actionRequests
                        ?.changed,
                    )
                  }
                />

                <SafetyMetric
                  label="Executed actions"
                  unsafe={
                    Number(
                      result
                        .safety
                        .executingOrSucceededActions ||
                      0,
                    ) !== 0
                  }
                />
              </div>
            )}

            {result.checks && (
              <div className="mt-6 rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-white/45">
                  Safety & Integration Checks
                </p>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {Object.entries(
                    result.checks,
                  ).map(
                    ([
                      name,
                      checkPassed,
                    ]) => (
                      <div
                        key={
                          name
                        }
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.035] px-3 py-2"
                      >
                        <span className="break-all text-xs font-semibold text-white/65">
                          {
                            name
                          }
                        </span>

                        <span
                          className={`text-xs font-black ${
                            checkPassed
                              ? "text-emerald-200"
                              : "text-red-200"
                          }`}
                        >
                          {checkPassed
                            ? "PASS"
                            : "FAIL"}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {(
              result
                .failedChecks
                ?.length ??
              0
            ) > 0 && (
              <div className="mt-6 rounded-2xl border border-red-300/20 bg-black/20 p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-red-200">
                  Failed checks
                </p>

                <p className="mt-3 break-words text-sm text-red-100">
                  {result
                    .failedChecks
                    ?.join(
                      ", ",
                    )}
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
        {label}
      </p>

      <p className="mt-2 break-all text-xl font-black text-white">
        {value}
      </p>
    </div>
  );
}

function SafetyMetric({
  label,
  unsafe,
}: {
  label:
    string;

  unsafe:
    boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
        {label}
      </p>

      <p
        className={`mt-2 text-xl font-black ${
          unsafe
            ? "text-red-200"
            : "text-emerald-200"
        }`}
      >
        {unsafe
          ? "YES"
          : "NO"}
      </p>
    </div>
  );
}
