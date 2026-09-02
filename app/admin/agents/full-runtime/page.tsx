"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  supabase,
} from "@/lib/supabase";

type JsonObject = Record<string, unknown>;

type ApiPayload = {
  ok?: boolean;
  error?: string;
  status?: JsonObject;
  ticks?: Array<Record<string, unknown>>;
  tick?: Record<string, unknown>;
};

function objectValue(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : {};
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function booleanValue(value: unknown) {
  return value === true;
}

async function readJson(response: Response): Promise<ApiPayload> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(`Server returned HTTP ${response.status} with an empty response.`);
  }
  try {
    return JSON.parse(text) as ApiPayload;
  } catch {
    throw new Error(`Server returned HTTP ${response.status} instead of JSON.`);
  }
}

export default function FullRuntimePage() {
  const [payload, setPayload] = useState<ApiPayload>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [rollbackConfirmation, setRollbackConfirmation] = useState("");

  const status = objectValue(payload.status);
  const gate = objectValue(status.gate);
  const blockers = Array.isArray(gate.blockers)
    ? gate.blockers.map((item) => String(item))
    : [];

  const phase = String(status.phase || "—");
  const activePopulation = numberValue(status.active_population_agents);
  const stagedPopulation = numberValue(status.staged_population_agents);
  const pausedPopulation = numberValue(status.paused_population_agents);
  const eligiblePopulation = numberValue(status.schedule_eligible_population_agents);
  const gateReady = booleanValue(gate.ready_for_100_agents);
  const agentsEnabled = booleanValue(status.agents_enabled);
  const activationUnlocked = booleanValue(status.activation_unlocked);
  const fullActive = phase === "3F" && activePopulation === 100 && agentsEnabled && activationUnlocked;

  const headline = useMemo(() => {
    if (fullActive) return "100 AGENTS ACTIVE";
    if (phase === "3F" && !agentsEnabled) return "FULL RUNTIME STOPPED";
    if (gateReady) return "READY FOR 100";
    return "WAITING FOR PILOT GATE";
  }, [fullActive, phase, agentsEnabled, gateReady]);

  const getAccessToken = useCallback(async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.access_token) throw new Error("Please sign in again as an administrator.");
    return session.access_token;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/admin/agents/full-runtime", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const next = await readJson(response);
      if (!response.ok || next.ok !== true) throw new Error(next.error || "Could not load Phase 3F status.");
      setPayload(next);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load Phase 3F status.");
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(action: string, extra: JsonObject = {}) {
    setLoading(true);
    setError("");
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/admin/agents/full-runtime", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, ...extra }),
      });
      const next = await readJson(response);
      if (!response.ok || next.ok !== true) throw new Error(next.error || "Phase 3F control failed.");
      setPayload(next);
      setConfirmation("");
      setRollbackConfirmation("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Phase 3F control failed.");
    } finally {
      setLoading(false);
    }
  }

  const metric = (label: string, value: string | number) => (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/35">{label}</p>
      <strong className="mt-2 block text-2xl font-black text-white">{value}</strong>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020813] px-4 py-8 text-white sm:px-6">
      <section className="mx-auto max-w-7xl">
        <a href="/admin/agents" className="text-sm font-bold text-cyan-200 no-underline hover:text-white">
          ← Agent Control Centre
        </a>

        <div className="mt-6 rounded-[30px] border border-cyan-200/14 bg-white/[0.045] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">DREAMSCAPE Agent Framework</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.045em]">Phase 3F · Full 100-Agent Runtime</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-white/55">
            Installs the full-population runtime now, but the remaining 90 cannot activate until the live 10-agent pilot evidence gate passes.
            Public, leaderboard and Exchange visibility stay off.
          </p>

          <div className="mt-6 rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-4 text-sm text-amber-100/80">
            {headline} · Phase {phase} · scheduler sharding: 10 × bounded ticks
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => void load()} disabled={loading} className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black disabled:opacity-40">
              Refresh
            </button>
            <button type="button" onClick={() => void act("run_test_shard")} disabled={loading} className="rounded-2xl border border-cyan-200/20 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-100 disabled:opacity-40">
              Run Test Shard
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-300/[0.06] p-4 text-sm text-red-100">{error}</div>
        )}

        <section className="mt-6 rounded-[30px] border border-white/10 bg-white/[0.035] p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">Pilot evidence gate</p>
              <h2 className={`mt-2 text-3xl font-black ${gateReady ? "text-emerald-200" : "text-amber-100"}`}>
                {gateReady ? "PASS" : "NOT YET"}
              </h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-black">
              Success {gate.success_rate_pct === null || gate.success_rate_pct === undefined ? "—" : `${gate.success_rate_pct}%`}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {metric("Completed-session agents", `${numberValue(gate.pilot_agents_with_completed_session)}/10`)}
            {metric("Successful executions", numberValue(gate.successful_executions))}
            {metric("Failed executions", numberValue(gate.failed_executions))}
            {metric("Policy assignments", `${numberValue(gate.rule_based_policy_assignments)}/100`)}
            {metric("Auto-paused pilot", numberValue(gate.currently_auto_paused_agents))}
            {metric("Failure streaks", numberValue(gate.agents_with_failure_streak))}
            {metric("Critical failures", numberValue(gate.critical_runtime_failures))}
            {metric("In-flight executions", numberValue(gate.inflight_executions))}
          </div>

          {blockers.length > 0 && (
            <div className="mt-5 rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-100/70">Current blockers</p>
              <ul className="mt-3 space-y-2 text-sm text-amber-100/75">
                {blockers.map((blocker) => <li key={blocker}>• {blocker}</li>)}
              </ul>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-[30px] border border-white/10 bg-white/[0.035] p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">Full population</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {metric("Active", activePopulation)}
            {metric("Staged", stagedPopulation)}
            {metric("Paused", pausedPopulation)}
            {metric("Schedule eligible", eligiblePopulation)}
            {metric("Simulation day", numberValue(status.simulation_day_index))}
            {metric("Open sessions", numberValue(status.open_sessions))}
            {metric("Execution runs", numberValue(status.execution_runs))}
            {metric("Auto-paused all", numberValue(status.currently_auto_paused_agents))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.04] p-4 text-sm text-emerald-100">Public visibility: {booleanValue(status.public_visibility_enabled) ? "ON" : "OFF"}</div>
            <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.04] p-4 text-sm text-emerald-100">Leaderboard visibility: {booleanValue(status.leaderboard_visibility_enabled) ? "ON" : "OFF"}</div>
            <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.04] p-4 text-sm text-emerald-100">Exchange visibility: {booleanValue(status.exchange_visibility_enabled) ? "ON" : "OFF"}</div>
          </div>
        </section>

        {!fullActive && phase === "3E" && (
          <section className="mt-6 rounded-[30px] border border-cyan-300/15 bg-cyan-300/[0.035] p-6">
            <h2 className="text-2xl font-black">Activate remaining 90</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">
              The control becomes usable only when the pilot gate is green. The existing 10 keep their schedule; the new 90 become active immediately and begin scheduled sessions on the next simulation day.
            </p>
            <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="ACTIVATE ALL 100 AGENTS" className="mt-5 w-full max-w-xl rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none" />
            <button
              type="button"
              disabled={loading || !gateReady || confirmation !== "ACTIVATE ALL 100 AGENTS"}
              onClick={() => void act("activate_full_100", { confirmation })}
              className="mt-4 rounded-2xl border border-cyan-200/25 bg-cyan-300/10 px-6 py-3 text-sm font-black text-cyan-100 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Activate All 100 Agents
            </button>
          </section>
        )}

        {phase === "3F" && (
          <section className="mt-6 rounded-[30px] border border-white/10 bg-white/[0.035] p-6">
            <h2 className="text-2xl font-black">Runtime controls</h2>
            <div className="mt-5 flex flex-wrap gap-3">
              {agentsEnabled ? (
                <button type="button" disabled={loading} onClick={() => void act("stop_full_100", { reason: "Stopped from Full 100-Agent Runtime page." })} className="rounded-2xl border border-red-300/25 bg-red-300/[0.08] px-6 py-3 text-sm font-black text-red-100 disabled:opacity-40">
                  Stop All Agents Now
                </button>
              ) : (
                <button type="button" disabled={loading} onClick={() => void act("resume_full_100", { reason: "Resumed from Full 100-Agent Runtime page." })} className="rounded-2xl border border-emerald-300/25 bg-emerald-300/[0.08] px-6 py-3 text-sm font-black text-emerald-100 disabled:opacity-40">
                  Resume Full Runtime
                </button>
              )}
            </div>

            <div className="mt-8 border-t border-white/10 pt-6">
              <p className="text-sm font-black text-red-100">Full rollback to dormant</p>
              <input value={rollbackConfirmation} onChange={(event) => setRollbackConfirmation(event.target.value)} placeholder="ROLL BACK ALL 100 TO DORMANT" className="mt-4 w-full max-w-xl rounded-2xl border border-red-300/15 bg-black/20 px-4 py-3 text-sm outline-none" />
              <button
                type="button"
                disabled={loading || rollbackConfirmation !== "ROLL BACK ALL 100 TO DORMANT"}
                onClick={() => void act("rollback_full_100", { confirmation: rollbackConfirmation, reason: "Full Phase 3F rollback requested by administrator." })}
                className="mt-4 rounded-2xl border border-red-300/25 bg-red-300/[0.08] px-6 py-3 text-sm font-black text-red-100 disabled:cursor-not-allowed disabled:opacity-35"
              >
                Roll Back All 100 To Dormant
              </button>
            </div>
          </section>
        )}

        <section className="mt-6 rounded-[30px] border border-white/10 bg-white/[0.035] p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">Recent orchestrator shards</p>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/8">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-white/[0.04] text-white/35">
                <tr>
                  <th className="px-3 py-3">Time</th><th className="px-3 py-3">Shard</th><th className="px-3 py-3">Day / Min</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Agents</th><th className="px-3 py-3">Claimed</th><th className="px-3 py-3">Decisions</th>
                </tr>
              </thead>
              <tbody>
                {(payload.ticks || []).map((tick) => (
                  <tr key={String(tick.id)} className="border-t border-white/[0.06]">
                    <td className="px-3 py-3 text-white/45">{String(tick.started_at || "—")}</td>
                    <td className="px-3 py-3">{String(tick.shard_index ?? 0)}/{String(tick.shard_count ?? 1)}</td>
                    <td className="px-3 py-3">{String(tick.simulation_day_index ?? "—")} / {String(tick.minute_in_simulation_day ?? "—")}</td>
                    <td className="px-3 py-3 font-black">{String(tick.status || "—")}</td>
                    <td className="px-3 py-3">{String(tick.agents_considered ?? 0)}</td>
                    <td className="px-3 py-3">{String(tick.sessions_claimed ?? 0)}</td>
                    <td className="px-3 py-3">{String(tick.decisions_completed ?? 0)} ok / {String(tick.decisions_failed ?? 0)} fail</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
