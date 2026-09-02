"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  supabase,
} from "@/lib/supabase";

type JsonObject = Record<
  string,
  unknown
>;

type Payload = {
  ok?: boolean;
  error?: string;
  status?: JsonObject;
  ticks?: JsonObject[];
  sessions?: JsonObject[];
  summary?: JsonObject;
};

function value(
  object: JsonObject | null,
  key: string,
) {
  return object?.[
    key
  ];
}

function displayDate(
  input: unknown,
) {
  if (!input) {
    return "—";
  }

  const date =
    new Date(
      String(
        input,
      ),
    );

  return Number.isNaN(
    date.getTime(),
  )
    ? String(
        input,
      )
    : date.toLocaleString();
}

function Metric({
  label,
  metric,
}: {
  label: string;
  metric: unknown;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
        {label}
      </p>

      <strong className="mt-2 block text-2xl font-black">
        {String(
          metric ??
          "—",
        )}
      </strong>
    </div>
  );
}

export default function PilotRuntimePage() {
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

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    busy,
    setBusy,
  ] =
    useState<
      string |
      null
    >(
      null,
    );

  const [
    error,
    setError,
  ] =
    useState(
      "",
    );

  const [
    notice,
    setNotice,
  ] =
    useState(
      "",
    );

  const [
    activationPhrase,
    setActivationPhrase,
  ] =
    useState(
      "",
    );

  const [
    rollbackPhrase,
    setRollbackPhrase,
  ] =
    useState(
      "",
    );

  async function getToken() {
    const {
      data: {
        session,
      },
    } =
      await supabase.auth.getSession();

    if (
      !session?.access_token
    ) {
      throw new Error(
        "Please sign in again as an administrator.",
      );
    }

    return session.access_token;
  }

  async function load() {
    setLoading(
      true,
    );

    setError(
      "",
    );

    try {
      const token =
        await getToken();

      const response =
        await fetch(
          "/api/admin/agents/pilot-runtime",
          {
            method:
              "GET",
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            cache:
              "no-store",
          },
        );

      const result =
        await response.json() as Payload;

      if (
        !response.ok ||
        result.ok !==
          true
      ) {
        throw new Error(
          result.error ||
          "Phase 3E status could not be loaded.",
        );
      }

      setPayload(
        result,
      );
    } catch (
      loadError
    ) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Phase 3E status could not be loaded.",
      );
    }

    setLoading(
      false,
    );
  }

  useEffect(
    () => {
      void load();
    },
    [],
  );

  async function runAction(
    action: string,
    confirmation?: string,
  ) {
    setBusy(
      action,
    );
    setError(
      "",
    );
    setNotice(
      "",
    );

    try {
      const token =
        await getToken();

      const response =
        await fetch(
          "/api/admin/agents/pilot-runtime",
          {
            method:
              "POST",
            headers: {
              Authorization:
                `Bearer ${token}`,
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                action,
                confirmation,
              }),
          },
        );

      const result =
        await response.json() as Payload;

      if (
        !response.ok ||
        result.ok !==
          true
      ) {
        throw new Error(
          result.error ||
          "Phase 3E action failed.",
        );
      }

      setNotice(
        action ===
          "activate"
          ? "10-agent pilot activated. Public visibility remains off."
          : action ===
              "stop"
            ? "Pilot stopped safely. Contracts and runtime execution are locked."
            : action ===
                "resume"
              ? "Pilot resumed on its original simulation clock."
              : action ===
                  "rollback"
                ? "Pilot rolled back to dormant. Runtime history was preserved."
                : "One bounded orchestrator tick completed.",
      );

      setActivationPhrase(
        "",
      );
      setRollbackPhrase(
        "",
      );

      await load();

    } catch (
      actionError
    ) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Phase 3E action failed.",
      );
    }

    setBusy(
      null,
    );
  }

  const status =
    payload?.status ||
    null;

  const active =
    value(
      status,
      "agents_enabled",
    ) === true &&
    value(
      status,
      "activation_unlocked",
    ) === true;

  const paused =
    Number(
      value(
        status,
        "paused_pilot_agents",
      ) ||
      0,
    ) === 10;

  const dormant =
    Number(
      value(
        status,
        "dormant_pilot_agents",
      ) ||
      0,
    ) === 10;

  const visibilitySafe =
    value(
      status,
      "public_visibility_enabled",
    ) === false &&
    value(
      status,
      "leaderboard_visibility_enabled",
    ) === false &&
    value(
      status,
      "exchange_visibility_enabled",
    ) === false;

  const stateLabel =
    active
      ? "ACTIVE PILOT"
      : paused
        ? "STOPPED / PAUSED"
        : dormant
          ? "READY TO ACTIVATE"
          : "CHECK REQUIRED";

  const ticks =
    payload?.ticks ||
    [];

  const sessions =
    payload?.sessions ||
    [];

  const recentTick =
    useMemo(
      () =>
        ticks[0] ||
        null,
      [
        ticks,
      ],
    );

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
            Phase 3E · Controlled Pilot Runtime
          </h1>

          <p className="mt-4 max-w-4xl text-sm leading-7 text-white/55">
            This is the explicit activation boundary for the first 10 autonomous agents. Public visibility remains locked off. The scheduler is bounded and resumable, and the pilot can be stopped or rolled back without deleting runtime history.
          </p>

          <div className={`mt-6 rounded-2xl border p-4 text-sm font-black ${
            active
              ? "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-100"
              : paused
                ? "border-amber-300/20 bg-amber-300/[0.06] text-amber-100"
                : "border-cyan-300/20 bg-cyan-300/[0.05] text-cyan-100"
          }`}>
            {stateLabel}
          </div>

          {visibilitySafe && (
            <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 p-4 text-xs text-white/50">
              Public agent visibility: OFF · Leaderboard visibility: OFF · Exchange visibility: OFF
            </div>
          )}
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-300/20 bg-red-300/[0.06] p-4 text-sm text-red-100">
            {error}
          </div>
        )}

        {notice && (
          <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4 text-sm text-emerald-100">
            {notice}
          </div>
        )}

        {loading ? (
          <p className="mt-6 text-sm text-white/45">
            Loading Phase 3E runtime…
          </p>
        ) : status && (
          <>
            <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Active pilot" metric={value(status,"active_pilot_agents")} />
              <Metric label="Paused pilot" metric={value(status,"paused_pilot_agents")} />
              <Metric label="Dormant pilot" metric={value(status,"dormant_pilot_agents")} />
              <Metric label="Executable contracts" metric={value(status,"active_executable_contracts")} />
              <Metric label="Sessions" metric={value(status,"run_sessions")} />
              <Metric label="Runtime decisions" metric={value(status,"runtime_policy_decisions")} />
              <Metric label="Action requests" metric={value(status,"action_requests")} />
              <Metric label="Execution runs" metric={value(status,"execution_runs")} />
            </section>

            <section className="mt-6 rounded-[30px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">
                Pilot controls
              </p>

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                {dormant && !active && (
                  <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.04] p-5">
                    <h2 className="text-xl font-black text-emerald-100">
                      Activate 10-agent pilot
                    </h2>

                    <p className="mt-2 text-xs leading-5 text-white/45">
                      This opens only the five approved gameplay contracts, activates only the staged pilot agents, starts the simulation clock and enables the global engine. It does not expose agents publicly.
                    </p>

                    <label className="mt-4 block text-xs font-bold text-white/60">
                      Type ACTIVATE 10-AGENT PILOT
                    </label>

                    <input
                      value={activationPhrase}
                      onChange={(event) => setActivationPhrase(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-cyan-300/30"
                    />

                    <button
                      type="button"
                      disabled={busy !== null || activationPhrase !== "ACTIVATE 10-AGENT PILOT"}
                      onClick={() => void runAction("activate",activationPhrase)}
                      className="mt-4 rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-5 py-3 text-sm font-black text-emerald-100 disabled:opacity-35"
                    >
                      {busy === "activate" ? "Activating…" : "Activate Pilot"}
                    </button>
                  </div>
                )}

                {active && (
                  <div className="rounded-2xl border border-red-300/15 bg-red-300/[0.04] p-5">
                    <h2 className="text-xl font-black text-red-100">
                      Safe stop
                    </h2>
                    <p className="mt-2 text-xs leading-5 text-white/45">
                      Immediately turns off the engine, disables pilot execution, locks all five contracts, cancels open work and pauses the 10 pilot agents. The simulation clock and history are preserved for resume.
                    </p>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void runAction("stop")}
                      className="mt-4 rounded-xl border border-red-300/25 bg-red-300/10 px-5 py-3 text-sm font-black text-red-100 disabled:opacity-35"
                    >
                      {busy === "stop" ? "Stopping…" : "Stop Pilot Now"}
                    </button>
                  </div>
                )}

                {paused && !active && (
                  <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] p-5">
                    <h2 className="text-xl font-black text-cyan-100">
                      Resume stopped pilot
                    </h2>
                    <p className="mt-2 text-xs leading-5 text-white/45">
                      Reopens the same five contracts and continues the existing simulation clock. Existing runtime history is retained.
                    </p>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void runAction("resume")}
                      className="mt-4 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-100 disabled:opacity-35"
                    >
                      {busy === "resume" ? "Resuming…" : "Resume Pilot"}
                    </button>
                  </div>
                )}

                {active && (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <h2 className="text-xl font-black">
                      Run one bounded tick now
                    </h2>
                    <p className="mt-2 text-xs leading-5 text-white/45">
                      Runs at most one decision and obeys the normal schedule. If no session is due, it records a harmless tick with no gameplay mutation.
                    </p>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void runAction("run_tick_now")}
                      className="mt-4 rounded-xl border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-black disabled:opacity-35"
                    >
                      {busy === "run_tick_now" ? "Running…" : "Run Tick Now"}
                    </button>
                  </div>
                )}

                {(active || paused) && (
                  <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-5 lg:col-span-2">
                    <h2 className="text-xl font-black text-amber-100">
                      Full rollback to dormant
                    </h2>
                    <p className="mt-2 text-xs leading-5 text-white/45">
                      Closes the engine, locks the five contracts, resets the simulation epoch and returns all 10 pilot agents to staged/dormant. Runtime history is preserved and not deleted.
                    </p>
                    <label className="mt-4 block text-xs font-bold text-white/60">
                      Type ROLL BACK PILOT TO DORMANT
                    </label>
                    <input
                      value={rollbackPhrase}
                      onChange={(event) => setRollbackPhrase(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-amber-300/30"
                    />
                    <button
                      type="button"
                      disabled={busy !== null || rollbackPhrase !== "ROLL BACK PILOT TO DORMANT"}
                      onClick={() => void runAction("rollback",rollbackPhrase)}
                      className="mt-4 rounded-xl border border-amber-300/25 bg-amber-300/10 px-5 py-3 text-sm font-black text-amber-100 disabled:opacity-35"
                    >
                      {busy === "rollback" ? "Rolling back…" : "Rollback To Dormant"}
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section className="mt-6 rounded-[30px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">
                    Scheduler
                  </p>
                  <h2 className="mt-2 text-2xl font-black">
                    Recent orchestrator activity
                  </h2>
                </div>
                <div className="text-right text-xs text-white/45">
                  <div>Simulation epoch: {displayDate(value(status,"simulation_epoch_at"))}</div>
                  <div>Latest tick: {displayDate(recentTick?.started_at)}</div>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto rounded-2xl border border-white/8">
                <table className="w-full min-w-[900px] text-left text-xs">
                  <thead className="bg-white/[0.04] text-white/35">
                    <tr>
                      <th className="px-3 py-3">Time</th>
                      <th className="px-3 py-3">Source</th>
                      <th className="px-3 py-3">Sim day/minute</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Sessions</th>
                      <th className="px-3 py-3">Decisions</th>
                      <th className="px-3 py-3">Failed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ticks.map((tick,index) => (
                      <tr key={String(tick.id || index)} className="border-t border-white/[0.06]">
                        <td className="px-3 py-3 text-white/50">{displayDate(tick.started_at)}</td>
                        <td className="px-3 py-3">{String(tick.trigger_source || "—")}</td>
                        <td className="px-3 py-3">{String(tick.simulation_day_index ?? "—")} / {String(tick.minute_in_simulation_day ?? "—")}</td>
                        <td className="px-3 py-3 font-black">{String(tick.status || "—")}</td>
                        <td className="px-3 py-3">{String(tick.sessions_claimed ?? 0)}</td>
                        <td className="px-3 py-3">{String(tick.decisions_attempted ?? 0)}</td>
                        <td className="px-3 py-3">{String(tick.decisions_failed ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-6 rounded-[30px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">
                Recent sessions
              </p>
              <div className="mt-5 grid gap-3">
                {sessions.slice(0,12).map((session,index) => (
                  <div key={String(session.id || index)} className="rounded-2xl border border-white/8 bg-black/20 p-4 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <strong>Sim day {String(session.simulation_day_index ?? "—")} · Session {String(session.session_number ?? "—")}</strong>
                      <span className="font-black uppercase text-cyan-100">{String(session.status || "—")}</span>
                    </div>
                    <div className="mt-2 text-white/45">
                      Planned {String(session.planned_decisions ?? 0)} · Attempted {String(session.attempted_decisions ?? 0)} · Completed {String(session.completed_decisions ?? 0)} · Failed {String(session.failed_decisions ?? 0)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
