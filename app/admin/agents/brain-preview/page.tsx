"use client";

import {
  useState,
} from "react";

import {
  supabase,
} from "@/lib/supabase";

type Candidate = {
  actionKey:
    string;

  actionVersion:
    number;

  parameters:
    Record<
      string,
      unknown
    >;

  score:
    number;

  available:
    boolean;

  contractStatus:
    string;

  reasons:
    string[];

  targetLabel:
    string |
    null;
};

type PreviewResult = {
  ok?:
    boolean;

  decisionId?:
    string;

  pilotOrder?:
    number;

  agentUserId?:
    string;

  error?:
    string;

  decision?:
    {
      agentCode:
        string;

      selected:
        Candidate;

      candidates:
        Candidate[];

      reasoningSummary:
        string;

      inputSummary:
        Record<
          string,
          unknown
        >;

      executionAllowed:
        false;
    };

  observation?:
    {
      snapshotId:
        string;

      sourceCount:
        number;

      observedAt:
        string;
    };
};

type Payload = {
  ok?:
    boolean;

  error?:
    string;

  previewOnly?:
    boolean;

  executionOccurred?:
    boolean;

  pilotSize?:
    number;

  passed?:
    number;

  failed?:
    number;

  results?:
    PreviewResult[];

  result?:
    PreviewResult;
};

function titleCase(
  value:
    string,
) {
  return value
    .replace(
      /[._-]+/g,
      " ",
    )
    .replace(
      /\b\w/g,
      (
        character,
      ) =>
        character
          .toUpperCase(),
    );
}

export default function BrainPreviewPage() {
  const [
    loading,
    setLoading,
  ] =
    useState(
      false,
    );

  const [
    payload,
    setPayload,
  ] =
    useState<
      Payload |
      null
    >(
      null,
    );

  async function runPilotPreview() {
    setLoading(
      true,
    );

    setPayload(
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
          "/api/admin/agents/brain-preview",
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
                allPilot:
                  true,
              }),
          },
        );

      const data =
        (
          await response
            .json()
            .catch(
              () => ({}),
            )
        ) as Payload;

      setPayload(
        data,
      );

    } catch (
      error
    ) {
      setPayload({
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Brain preview failed.",
      });
    }

    setLoading(
      false,
    );
  }

  const results =
    payload
      ?.results ||
    [];

  return (
    <main className="min-h-screen bg-[#020813] px-4 py-8 text-white sm:px-6">
      <section className="mx-auto max-w-7xl">
        <a
          href="/admin/agents"
          className="text-sm font-bold text-cyan-200 no-underline hover:text-white"
        >
          ← Agent Control Centre
        </a>

        <div className="mt-6 rounded-[30px] border border-cyan-200/14 bg-white/[0.045] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
            DREAMSCAPE Agent Framework
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-[-0.045em]">
            Phase 3B · RuleBasedPolicyV1
          </h1>

          <p className="mt-4 max-w-4xl text-sm leading-7 text-white/55">
            Preview what the 10-agent pilot brain would choose from a fresh
            18-source world snapshot and recalled memory. Decisions are stored
            for analysis but cannot execute.
          </p>

          <div className="mt-6 rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-4 text-sm text-amber-100/80">
            Preview only · agents remain dormant · simulation clock off ·
            no DT/DG mutation · no gameplay action execution
          </div>

          <button
            type="button"
            disabled={
              loading
            }
            onClick={
              runPilotPreview
            }
            className="mt-6 min-h-12 rounded-2xl border border-cyan-200/25 bg-cyan-300/10 px-7 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/15 disabled:opacity-40"
          >
            {loading
              ? "Running 10-Agent Brain Preview…"
              : "Preview 10-Agent Brain"}
          </button>
        </div>

        {payload && (
          <section className="mt-6 rounded-[30px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">
                  Preview Result
                </p>

                <h2
                  className={`mt-2 text-3xl font-black ${
                    payload.ok
                      ? "text-emerald-200"
                      : "text-red-200"
                  }`}
                >
                  {payload.ok
                    ? "PASS"
                    : "CHECK REQUIRED"}
                </h2>
              </div>

              <div className="flex gap-2 text-xs font-black">
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">
                  Passed {payload.passed ?? 0}
                </span>

                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">
                  Failed {payload.failed ?? 0}
                </span>
              </div>
            </div>

            {payload.error && (
              <p className="mt-5 rounded-2xl border border-red-300/20 bg-red-300/[0.06] p-4 text-sm text-red-100">
                {payload.error}
              </p>
            )}

            <div className="mt-6 grid gap-4">
              {results.map(
                (
                  result,
                ) => (
                  <article
                    key={
                      result.decisionId ||
                      `${result.pilotOrder}:${result.agentUserId}`
                    }
                    className={`rounded-[24px] border p-5 ${
                      result.ok
                        ? "border-white/9 bg-black/20"
                        : "border-red-300/20 bg-red-300/[0.05]"
                    }`}
                  >
                    {!result.ok ? (
                      <>
                        <p className="font-black text-red-100">
                          Pilot #{result.pilotOrder ?? "—"} failed
                        </p>

                        <p className="mt-2 text-sm text-red-100/70">
                          {result.error}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.15em] text-cyan-200">
                              Pilot #{result.pilotOrder}
                            </p>

                            <h3 className="mt-2 text-2xl font-black">
                              {result.decision?.agentCode}
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-white/52">
                              {result.decision?.reasoningSummary}
                            </p>
                          </div>

                          <div className="min-w-[250px] rounded-2xl border border-emerald-300/16 bg-emerald-300/[0.05] p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.13em] text-white/35">
                              Selected
                            </p>

                            <strong className="mt-2 block text-sm text-emerald-100">
                              {titleCase(
                                result
                                  .decision
                                  ?.selected
                                  .actionKey ||
                                  "",
                              )}
                            </strong>

                            <span className="mt-2 block text-xs text-white/45">
                              {result
                                .decision
                                ?.selected
                                .targetLabel ||
                                "No target"}
                            </span>

                            <span className="mt-2 block text-xs font-black text-[#ffd18a]">
                              Score{" "}
                              {Number(
                                result
                                  .decision
                                  ?.selected
                                  .score ||
                                0,
                              ).toFixed(
                                3,
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="mt-5 overflow-x-auto rounded-2xl border border-white/8">
                          <table className="w-full min-w-[900px] text-left text-xs">
                            <thead className="bg-white/[0.04] text-white/35">
                              <tr>
                                <th className="px-3 py-3">Rank</th>
                                <th className="px-3 py-3">Action</th>
                                <th className="px-3 py-3">Target</th>
                                <th className="px-3 py-3">Score</th>
                                <th className="px-3 py-3">Contract</th>
                                <th className="px-3 py-3">Reasons</th>
                              </tr>
                            </thead>

                            <tbody>
                              {(
                                result
                                  .decision
                                  ?.candidates ||
                                []
                              ).map(
                                (
                                  candidate,
                                  index,
                                ) => (
                                  <tr
                                    key={
                                      candidate.actionKey
                                    }
                                    className="border-t border-white/[0.06]"
                                  >
                                    <td className="px-3 py-3">
                                      #{index + 1}
                                    </td>

                                    <td className="px-3 py-3 font-bold">
                                      {titleCase(
                                        candidate.actionKey,
                                      )}
                                    </td>

                                    <td className="px-3 py-3 text-white/50">
                                      {candidate.targetLabel || "—"}
                                    </td>

                                    <td className="px-3 py-3 font-black text-[#ffd18a]">
                                      {candidate.available
                                        ? candidate.score.toFixed(
                                            3,
                                          )
                                        : "N/A"}
                                    </td>

                                    <td className="px-3 py-3 uppercase text-white/45">
                                      {candidate.contractStatus}
                                    </td>

                                    <td className="px-3 py-3 text-white/45">
                                      {candidate.reasons.join(
                                        " · ",
                                      )}
                                    </td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </article>
                ),
              )}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
