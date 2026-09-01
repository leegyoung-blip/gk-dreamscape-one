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

  failureId?:
    string;

  httpStatus?:
    number;

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

type PilotMember = {
  userId:
    string;

  agentCode:
    string;

  naturalName:
    string;

  worldAffinity:
    string;

  pilotOrder:
    number;

  pilotStatus:
    string;

  lifecycleStatus:
    string;
};

type OverviewPayload = {
  ok?:
    boolean;

  error?:
    string;

  runtime?:
    {
      pilotMembers?:
        PilotMember[];
    };
};

type SinglePreviewPayload = {
  ok?:
    boolean;

  error?:
    string;

  failureId?:
    string;

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

async function readJsonResponse<T>(
  response:
    Response,
): Promise<T> {
  const text =
    await response.text();

  if (
    !text.trim()
  ) {
    throw new Error(
      `Server returned HTTP ${response.status} with an empty response.`,
    );
  }

  try {
    return JSON.parse(
      text,
    ) as T;
  } catch {
    const compact =
      text
        .replace(
          /\s+/g,
          " ",
        )
        .trim()
        .slice(
          0,
          500,
        );

    throw new Error(
      `Server returned HTTP ${response.status} instead of JSON. ${compact}`,
    );
  }
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
    results,
    setResults,
  ] =
    useState<
      PreviewResult[]
    >(
      [],
    );

  const [
    currentAgent,
    setCurrentAgent,
  ] =
    useState<
      string
    >(
      "",
    );

  const [
    pageError,
    setPageError,
  ] =
    useState<
      string
    >(
      "",
    );

  const [
    started,
    setStarted,
  ] =
    useState(
      false,
    );

  async function getAccessToken() {
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

    return session
      .access_token;
  }

  async function loadPilotMembers(
    accessToken:
      string,
  ) {
    const response =
      await fetch(
        "/api/admin/agents/overview",
        {
          method:
            "GET",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },

          cache:
            "no-store",
        },
      );

    const payload =
      await readJsonResponse<
        OverviewPayload
      >(
        response,
      );

    if (
      !response.ok ||
      payload.ok !==
        true
    ) {
      throw new Error(
        payload.error ||
        `Could not load pilot members. HTTP ${response.status}.`,
      );
    }

    const members =
      payload.runtime
        ?.pilotMembers ||
      [];

    if (
      members.length !==
      10
    ) {
      throw new Error(
        `Phase 3B expected exactly 10 pilot members; found ${members.length}.`,
      );
    }

    return [
      ...members,
    ].sort(
      (
        left,
        right,
      ) =>
        left.pilotOrder -
        right.pilotOrder,
    );
  }

  async function previewOneAgent({
    accessToken,
    member,
  }: {
    accessToken:
      string;

    member:
      PilotMember;
  }): Promise<PreviewResult> {
    const response =
      await fetch(
        "/api/admin/agents/brain-preview",
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              agentCode:
                member.agentCode,
            }),
        },
      );

    let payload:
      SinglePreviewPayload;

    try {
      payload =
        await readJsonResponse<
          SinglePreviewPayload
        >(
          response,
        );
    } catch (
      error
    ) {
      return {
        ok: false,

        pilotOrder:
          member.pilotOrder,

        agentUserId:
          member.userId,

        httpStatus:
          response.status,

        error:
          error instanceof Error
            ? error.message
            : `Agent preview returned HTTP ${response.status}.`,
      };
    }

    if (
      !response.ok ||
      payload.ok !==
        true ||
      !payload.result
    ) {
      return {
        ok: false,

        pilotOrder:
          member.pilotOrder,

        agentUserId:
          member.userId,

        failureId:
          payload.failureId,

        httpStatus:
          response.status,

        error:
          payload.error ||
          `Agent preview failed with HTTP ${response.status}.`,
      };
    }

    return {
      ...payload.result,

      ok: true,

      pilotOrder:
        member.pilotOrder,

      agentUserId:
        member.userId,

      httpStatus:
        response.status,
    };
  }

  async function runPilotPreview() {
    setLoading(
      true,
    );

    setStarted(
      true,
    );

    setResults(
      [],
    );

    setPageError(
      "",
    );

    setCurrentAgent(
      "",
    );

    try {
      const accessToken =
        await getAccessToken();

      const members =
        await loadPilotMembers(
          accessToken,
        );

      /*
       * IMPORTANT
       * ---------
       * Do NOT send all ten agents through one serverless request.
       *
       * Each agent gets its own request so:
       * - one slow WorldObserver run cannot time out the whole pilot,
       * - successful agents are retained if a later agent fails,
       * - HTTP/server errors are visible per agent,
       * - Vercel has a fresh execution window for each agent.
       */
      for (
        const member
        of members
      ) {
        setCurrentAgent(
          member.agentCode,
        );

        const result =
          await previewOneAgent({
            accessToken,
            member,
          });

        setResults(
          (
            current,
          ) => [
            ...current,
            result,
          ],
        );
      }

      setCurrentAgent(
        "",
      );

    } catch (
      error
    ) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Brain preview could not start.",
      );
    }

    setLoading(
      false,
    );
  }

  const passed =
    results.filter(
      (
        result,
      ) =>
        result.ok ===
        true,
    ).length;

  const failed =
    results.filter(
      (
        result,
      ) =>
        result.ok !==
        true,
    ).length;

  const complete =
    results.length ===
    10;

  const overallPass =
    complete &&
    failed ===
      0;

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
            Preview what the 10-agent pilot brain would choose from fresh
            18-source world snapshots and recalled memory. Each pilot member is
            processed in its own server request so one slow observation cannot
            terminate the entire run.
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
              ? `Running ${results.length + 1}/10${
                  currentAgent
                    ? ` · ${currentAgent}`
                    : ""
                }…`
              : "Preview 10-Agent Brain"}
          </button>
        </div>

        {started && (
          <section className="mt-6 rounded-[30px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">
                  Preview Result
                </p>

                <h2
                  className={`mt-2 text-3xl font-black ${
                    overallPass
                      ? "text-emerald-200"
                      : complete ||
                          pageError
                        ? "text-red-200"
                        : "text-amber-100"
                  }`}
                >
                  {overallPass
                    ? "PASS"
                    : complete ||
                        pageError
                      ? "CHECK REQUIRED"
                      : "RUNNING"}
                </h2>
              </div>

              <div className="flex flex-wrap gap-2 text-xs font-black">
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">
                  Processed {results.length}/10
                </span>

                <span className="rounded-full border border-emerald-200/15 bg-emerald-300/[0.05] px-3 py-2 text-emerald-100">
                  Passed {passed}
                </span>

                <span className="rounded-full border border-red-200/15 bg-red-300/[0.05] px-3 py-2 text-red-100">
                  Failed {failed}
                </span>
              </div>
            </div>

            {pageError && (
              <p className="mt-5 rounded-2xl border border-red-300/20 bg-red-300/[0.06] p-4 text-sm text-red-100">
                {pageError}
              </p>
            )}

            <div className="mt-6 grid gap-4">
              {results.map(
                (
                  result,
                  index,
                ) => (
                  <article
                    key={
                      result.decisionId ||
                      `${result.pilotOrder}:${result.agentUserId}:${index}`
                    }
                    className={`rounded-[24px] border p-5 ${
                      result.ok
                        ? "border-white/9 bg-black/20"
                        : "border-red-300/20 bg-red-300/[0.05]"
                    }`}
                  >
                    {!result.ok ? (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="font-black text-red-100">
                            Pilot #{result.pilotOrder ?? "—"} failed
                          </p>

                          {result.httpStatus !== undefined && (
                            <span className="rounded-full border border-red-200/15 bg-red-300/[0.06] px-3 py-1 text-[10px] font-black text-red-100">
                              HTTP {result.httpStatus}
                            </span>
                          )}
                        </div>

                        <p className="mt-2 break-words text-sm leading-6 text-red-100/70">
                          {result.error}
                        </p>

                        {result.failureId && (
                          <p className="mt-2 break-all text-[10px] text-red-100/40">
                            Failure ID: {result.failureId}
                          </p>
                        )}
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
                                  candidateIndex,
                                ) => (
                                  <tr
                                    key={
                                      `${candidate.actionKey}:${candidateIndex}`
                                    }
                                    className="border-t border-white/[0.06]"
                                  >
                                    <td className="px-3 py-3">
                                      #{candidateIndex + 1}
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
