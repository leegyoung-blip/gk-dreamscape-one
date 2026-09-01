"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import InitialPopulationProvisioner from "@/components/admin/agents/InitialPopulationProvisioner";

type AgentSettings = {
  agentsEnabled: boolean;
  publicVisibilityEnabled: boolean;
  leaderboardVisibilityEnabled: boolean;
  exchangeVisibilityEnabled: boolean;
  defaultSimulationAccessTier: string;
  updatedAt: string | null;
};

type RuntimePilotMember = {
  userId: string;
  agentCode: string;
  naturalName: string;
  worldAffinity: string;
  pilotOrder: number;
  pilotStatus: string;
  lifecycleStatus: string;
  consecutiveFailures: number;
  totalFailures: number;
  lastFailureAt: string | null;
};

type RuntimeFailure = {
  id: string;
  agentCode: string | null;
  failureScope: string;
  severity: string;
  errorCode: string;
  message: string;
  failureStreakAfter: number;
  autoPaused: boolean;
  emailStatus: string;
  emailAttempts: number;
  createdAt: string;
};

type RuntimeOverview = {
  phase: string;
  pilotKey: string;
  pilotSize: number;
  activationUnlocked: boolean;
  publicVisibilityUnlocked: boolean;
  simulationEpochAt: string | null;
  simulationDayDurationMinutes: number;
  minSessionsPerSimDay: number;
  maxSessionsPerSimDay: number;
  minDecisionsPerSession: number;
  maxDecisionsPerSession: number;
  maxDailyDtSpendFraction: number;
  maxDailyDtSpendAbsolute: number;
  maxDailyDgSpend: number;
  minimumDtReserveAbsolute: number;
  minimumDtReserveFraction: number;
  minimumDgReserve: number;
  autoPauseFailureThreshold: number;
  failureEmailRecipient: string;
  pilotMembers: RuntimePilotMember[];
  recentFailures: RuntimeFailure[];
};

type AgentSummary = {
  planned: number;
  provisioned: number;
  remaining: number;
  dormant: number;
  active: number;
  paused: number;
  retired: number;
  students: number;
  regular: number;
  nova: number;
  milo: number;
  both: number;
  currentDt: number;
  currentDg: number;
  provisioningEvents: number;
};

type AgentRow = {
  number: number;
  provisioned: boolean;
  userId: string | null;
  agentCode: string;
  internalHandle: string;
  naturalName: string;
  username: string;
  email: string;
  accountRole: string;
  lifecycleStatus: string;
  worldAffinity: string;
  syntheticAge: number;
  educationSystem: string;
  educationLevel: string | null;
  primaryLevel: number | null;
  archetype: string;
  startingDtTarget: number;
  startingDgTarget: number;
  currentDt: number | null;
  currentDg: number | null;
  simulationAccessTier: string | null;
  publicVisibilityOverride: boolean | null;
  pilotOrder: number | null;
  pilotStatus: string | null;
  consecutiveFailures: number;
  totalFailures: number;
};

type AgentOverviewResponse = {
  ok?: boolean;
  error?: string;
  settings: AgentSettings;
  runtime: RuntimeOverview;
  summary: AgentSummary;
  agents: AgentRow[];
};

type FilterStatus = "all" | "planned" | "dormant" | "active" | "paused" | "retired";
type FilterWorld = "all" | "nova" | "milo" | "both";

function formatNumber(value: number | null | undefined) {
  return Number(value || 0).toLocaleString();
}

function titleCase(value: string | null | undefined) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function statusClasses(status: string) {
  switch (status) {
    case "active":
    case "sent":
      return "border-emerald-300/30 bg-emerald-400/12 text-emerald-100";
    case "dormant":
    case "staged":
      return "border-cyan-300/30 bg-cyan-400/12 text-cyan-100";
    case "paused":
      return "border-amber-300/30 bg-amber-400/12 text-amber-100";
    case "retired":
    case "failed":
      return "border-rose-300/30 bg-rose-400/12 text-rose-100";
    default:
      return "border-white/15 bg-white/[0.06] text-white/60";
  }
}

function Metric({ label, value, description }: { label: string; value: string | number; description: string }) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/38">{label}</p>
      <strong className="mt-3 block text-3xl font-black tracking-[-0.05em]">{value}</strong>
      <p className="mt-2 text-xs text-white/38">{description}</p>
    </article>
  );
}

function Toggle({
  checked,
  disabled,
  title,
  description,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  title: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between gap-5 rounded-2xl border p-4 text-left transition ${
        checked ? "border-cyan-300/28 bg-cyan-300/[0.08]" : "border-white/10 bg-white/[0.035]"
      } ${disabled ? "cursor-not-allowed opacity-50" : "hover:border-white/20"}`}
    >
      <span>
        <strong className="block text-sm font-bold text-white">{title}</strong>
        <span className="mt-1 block text-xs leading-5 text-white/45">{description}</span>
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-cyan-300" : "bg-white/14"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-[#041124] transition ${checked ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

export default function AgentsAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [overview, setOverview] = useState<AgentOverviewResponse | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterWorld, setFilterWorld] = useState<FilterWorld>("all");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  async function loadOverview() {
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) {
        router.replace("/login?next=/admin/agents");
        return;
      }

      const response = await fetch("/api/admin/agents/overview", {
        method: "GET",
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as AgentOverviewResponse;
      if (!response.ok) throw new Error(payload.error || "Agent Control Centre could not be loaded.");
      setOverview(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Agent Control Centre could not be loaded.");
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  async function runtimeAction(action: string, options?: { agentCode?: string; reason?: string }) {
    setBusyAction(`${action}:${options?.agentCode || ""}`);
    setError("");
    setNotice("");

    try {
      const token = await getToken();
      if (!token) throw new Error("Please sign in again.");

      const response = await fetch("/api/admin/agents/runtime", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, ...options }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        result?: { email?: { sent?: boolean; recipient?: string | null; error?: string } };
      };

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || payload.result?.email?.error || "Runtime action failed.");
      }

      if (action === "test_failure_email") {
        setNotice(
          payload.result?.email?.sent
            ? `Failure alert sent through Resend to ${payload.result.email.recipient || "the admin address"}.`
            : "Failure test was recorded. Check the email status below.",
        );
      } else if (action === "emergency_stop") {
        setNotice("Emergency stop applied. Engine is off and any active agents were paused.");
      } else {
        setNotice("Runtime state updated.");
      }

      await loadOverview();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Runtime action failed.");
    }

    setBusyAction(null);
  }

  async function updateSetting(
    key: "publicVisibilityEnabled" | "leaderboardVisibilityEnabled" | "exchangeVisibilityEnabled",
    value: boolean,
  ) {
    setBusyAction(key);
    setError("");

    try {
      const token = await getToken();
      if (!token) throw new Error("Please sign in again.");

      const response = await fetch("/api/admin/agents/overview", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [key]: value }),
      });

      const payload = (await response.json()) as { error?: string; settings?: AgentSettings };
      if (!response.ok || !payload.settings) throw new Error(payload.error || "Agent setting could not be updated.");

      setOverview((current) => current ? { ...current, settings: payload.settings! } : current);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Agent setting could not be updated.");
    }

    setBusyAction(null);
  }

  const filteredAgents = useMemo(() => {
    if (!overview) return [];
    const cleanSearch = search.trim().toLowerCase();

    return overview.agents.filter((agent) => {
      if (filterStatus !== "all" && agent.lifecycleStatus !== filterStatus) return false;
      if (filterWorld !== "all" && agent.worldAffinity !== filterWorld) return false;
      if (!cleanSearch) return true;

      return [
        agent.agentCode,
        agent.internalHandle,
        agent.naturalName,
        agent.username,
        agent.email,
        agent.archetype,
        agent.educationLevel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(cleanSearch);
    });
  }, [overview, search, filterStatus, filterWorld]);

  if (loading) {
    return <main className="min-h-screen bg-[#020813] px-5 py-12 text-white"><div className="mx-auto max-w-7xl text-sm text-white/50">Loading Agent Control Centre...</div></main>;
  }

  if (!overview) {
    return (
      <main className="min-h-screen bg-[#020813] px-5 py-12 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-rose-300/20 bg-rose-400/[0.06] p-7">
          <h1 className="text-3xl font-bold">Agent Control Centre</h1>
          <p className="mt-4 text-rose-100/75">{error || "The agent system could not be loaded."}</p>
        </div>
      </main>
    );
  }

  const { settings, summary, runtime } = overview;
  const pilotCounts = runtime.pilotMembers.reduce<Record<string, number>>((counts, agent) => {
    counts[agent.worldAffinity] = (counts[agent.worldAffinity] || 0) + 1;
    return counts;
  }, {});

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020813] px-4 py-6 text-white sm:px-7 sm:py-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(83,215,255,0.11),transparent_30%),radial-gradient(circle_at_90%_10%,rgba(139,92,246,0.10),transparent_30%),linear-gradient(180deg,#041124_0%,#020813_100%)]" />

      <div className="relative z-10 mx-auto max-w-[1600px]">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#7ee8ff]">Dreamscape Administration</p>
            <h1 className="mt-3 text-4xl font-bold tracking-[-0.05em] sm:text-6xl">Agent Control Centre</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/52 sm:text-base">Phase 3 runtime safety, pilot staging, failure reporting and population controls.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => router.push("/admin/dream-tokens")} className="min-h-11 rounded-full border border-violet-200/25 bg-violet-400/10 px-5 text-xs font-extrabold uppercase tracking-[0.12em]">Admin Panel</button>
            <button type="button" onClick={() => router.push("/profile")} className="min-h-11 rounded-full border border-white/12 bg-white/[0.05] px-5 text-xs font-extrabold uppercase tracking-[0.12em]">Profile</button>
            <button type="button" onClick={() => void loadOverview()} className="min-h-11 rounded-full border border-cyan-200/25 bg-cyan-300/[0.08] px-5 text-xs font-extrabold uppercase tracking-[0.12em]">Refresh</button>
          </div>
        </header>

        {error && <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-400/[0.07] px-5 py-4 text-sm text-rose-100">{error}</div>}
        {notice && <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.06] px-5 py-4 text-sm text-emerald-100">{notice}</div>}

        <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Metric label="Provisioned" value={summary.provisioned} description="Real simulation identities" />
          <Metric label="Dormant" value={summary.dormant} description="Not currently running" />
          <Metric label="Active" value={summary.active} description="Autonomous agents" />
          <Metric label="Pilot" value={runtime.pilotMembers.length} description="Phase 3 staged cohort" />
          <Metric label="DT Held" value={formatNumber(summary.currentDt)} description="Current agent DT" />
          <Metric label="DG Held" value={formatNumber(summary.currentDg)} description="Current agent DG" />
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-2">
          <article className="rounded-[28px] border border-cyan-300/14 bg-white/[0.045] p-6 backdrop-blur-xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-200">Phase 3A Runtime</p>
            <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#061632]/70 p-5">
              <div>
                <strong className="text-lg">Autonomous Engine</strong>
                <p className="mt-1 text-xs leading-5 text-white/45">Activation remains hard-locked until Brain V1, executable adapters and the orchestrator are ready.</p>
              </div>
              <span className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase ${settings.agentsEnabled ? "border-emerald-300/30 bg-emerald-300/12 text-emerald-100" : "border-white/12 bg-white/[0.05] text-white/50"}`}>
                {settings.agentsEnabled ? "Enabled" : "Off"}
              </span>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><span className="text-[10px] uppercase tracking-[0.14em] text-white/35">Activation gate</span><strong className="mt-2 block text-sm">{runtime.activationUnlocked ? "Unlocked" : "Locked"}</strong></div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"><span className="text-[10px] uppercase tracking-[0.14em] text-white/35">Simulation clock</span><strong className="mt-2 block text-sm">{runtime.simulationEpochAt ? "Started" : "Not started"}</strong></div>
            </div>

            <button type="button" disabled={busyAction !== null} onClick={() => void runtimeAction("emergency_stop", { reason: "Emergency stop from Phase 3 Agent Control Centre." })} className="mt-5 min-h-12 w-full rounded-2xl border border-rose-300/25 bg-rose-400/10 px-5 text-sm font-black text-rose-100 disabled:opacity-40">Emergency Stop</button>
          </article>

          <article className="rounded-[28px] border border-violet-200/12 bg-[linear-gradient(145deg,rgba(33,21,69,0.48),rgba(5,18,40,0.72))] p-6 backdrop-blur-xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-violet-200">Pilot Runtime Rules</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Simulated day", `${runtime.simulationDayDurationMinutes} real minutes`],
                ["Sessions / day", `${runtime.minSessionsPerSimDay}–${runtime.maxSessionsPerSimDay}`],
                ["Decisions / session", `${runtime.minDecisionsPerSession}–${runtime.maxDecisionsPerSession}`],
                ["DT daily spend cap", `min(${Math.round(runtime.maxDailyDtSpendFraction * 100)}% balance, ${formatNumber(runtime.maxDailyDtSpendAbsolute)} DT)`],
                ["DG daily spend cap", `${runtime.maxDailyDgSpend} DG`],
                ["Auto-pause", `${runtime.autoPauseFailureThreshold} consecutive failures`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.035] p-4"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/35">{label}</p><strong className="mt-2 block text-sm text-white/80">{value}</strong></div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-[30px] border border-cyan-300/14 bg-cyan-300/[0.035] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-100">Phase 3 Pilot</p><h2 className="mt-2 text-3xl font-bold tracking-[-0.04em]">10 staged agents</h2><p className="mt-2 text-sm text-white/45">4 Nova · 3 Milo · 3 Both. All remain dormant in Phase 3A.</p></div>
            <div className="flex gap-2 text-xs font-black"><span className="rounded-full border border-cyan-300/16 bg-cyan-300/[0.06] px-3 py-2">Nova {pilotCounts.nova || 0}</span><span className="rounded-full border border-violet-300/16 bg-violet-300/[0.06] px-3 py-2">Milo {pilotCounts.milo || 0}</span><span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-2">Both {pilotCounts.both || 0}</span></div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-white/8">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead className="bg-[#061632]/90 text-[10px] font-black uppercase tracking-[0.12em] text-white/40"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Agent</th><th className="px-4 py-3">World</th><th className="px-4 py-3">Pilot</th><th className="px-4 py-3">Lifecycle</th><th className="px-4 py-3">Failures</th><th className="px-4 py-3">Control</th></tr></thead>
              <tbody>
                {runtime.pilotMembers.map((agent) => (
                  <tr key={agent.userId} className="border-t border-white/[0.07]">
                    <td className="px-4 py-4 text-xs text-white/45">{agent.pilotOrder}</td>
                    <td className="px-4 py-4"><strong className="block text-sm">{agent.agentCode}</strong><span className="mt-1 block text-xs text-white/40">{agent.naturalName}</span></td>
                    <td className="px-4 py-4 text-xs capitalize text-white/65">{agent.worldAffinity}</td>
                    <td className="px-4 py-4"><span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase ${statusClasses(agent.pilotStatus)}`}>{titleCase(agent.pilotStatus)}</span></td>
                    <td className="px-4 py-4"><span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase ${statusClasses(agent.lifecycleStatus)}`}>{titleCase(agent.lifecycleStatus)}</span></td>
                    <td className="px-4 py-4 text-xs"><strong>{agent.consecutiveFailures}</strong><span className="text-white/35"> streak · {agent.totalFailures} total</span></td>
                    <td className="px-4 py-4">
                      {agent.lifecycleStatus === "paused" ? (
                        <button type="button" disabled={busyAction !== null} onClick={() => void runtimeAction("resume_agent", { agentCode: agent.agentCode })} className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-2 text-[10px] font-black uppercase disabled:opacity-40">Resume Dormant</button>
                      ) : (
                        <button type="button" disabled={busyAction !== null} onClick={() => void runtimeAction("pause_agent", { agentCode: agent.agentCode })} className="rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-3 py-2 text-[10px] font-black uppercase disabled:opacity-40">Pause</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
          <article className="rounded-[28px] border border-rose-300/12 bg-rose-300/[0.035] p-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-rose-100">Failure Alerts</p>
            <h2 className="mt-3 text-2xl font-bold">Resend reporting</h2>
            <p className="mt-3 text-sm leading-6 text-white/45">Agent, orchestrator, action and system failures are recorded durably and immediately reported through Resend.</p>
            <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4"><span className="text-[10px] uppercase tracking-[0.14em] text-white/35">Admin recipient</span><strong className="mt-2 block break-all text-sm">{runtime.failureEmailRecipient}</strong></div>
            <div className="mt-4 grid gap-2">
              <button type="button" disabled={busyAction !== null} onClick={() => void runtimeAction("test_failure_email")} className="min-h-11 rounded-2xl border border-rose-300/20 bg-rose-300/[0.08] px-4 text-xs font-black uppercase tracking-[0.1em] disabled:opacity-40">Send Failure Email Test</button>
              <button type="button" disabled={busyAction !== null} onClick={() => void runtimeAction("retry_failure_emails")} className="min-h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-xs font-black uppercase tracking-[0.1em] disabled:opacity-40">Retry Unsent Alerts</button>
            </div>
          </article>

          <article className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
            <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/45">Recent Runtime Failures</p><h2 className="mt-2 text-2xl font-bold">Failure audit</h2></div><span className="text-xs text-white/35">Last {runtime.recentFailures.length}</span></div>
            <div className="mt-5 max-h-[410px] space-y-2 overflow-y-auto pr-1">
              {runtime.recentFailures.length === 0 ? (
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 text-sm text-white/40">No runtime failures recorded.</div>
              ) : runtime.recentFailures.map((failure) => (
                <div key={failure.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center gap-2"><strong className="text-xs">{failure.agentCode || "SYSTEM"}</strong><span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${statusClasses(failure.emailStatus)}`}>Email {failure.emailStatus}</span>{failure.autoPaused && <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-2 py-1 text-[9px] font-black uppercase text-amber-100">Auto-paused</span>}</div>
                  <p className="mt-2 text-xs font-bold text-rose-100/80">{failure.errorCode}</p>
                  <p className="mt-1 text-xs leading-5 text-white/45">{failure.message}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-[28px] border border-violet-200/12 bg-[linear-gradient(145deg,rgba(33,21,69,0.45),rgba(5,18,40,0.72))] p-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-violet-200">Public Visibility</p>
          <p className="mt-2 text-sm text-white/45">Locked OFF throughout the initial Phase 3 pilot.</p>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <Toggle title="Global agent visibility" description="Locked until the pilot is reviewed." checked={settings.publicVisibilityEnabled} disabled={!runtime.publicVisibilityUnlocked || busyAction !== null} onChange={(value) => void updateSetting("publicVisibilityEnabled", value)} />
            <Toggle title="Leaderboards" description="Agents remain hidden from public leaderboards." checked={settings.leaderboardVisibilityEnabled} disabled={!runtime.publicVisibilityUnlocked || busyAction !== null} onChange={(value) => void updateSetting("leaderboardVisibilityEnabled", value)} />
            <Toggle title="Milo Exchange" description="Agent Exchange activity remains hidden." checked={settings.exchangeVisibilityEnabled} disabled={!runtime.publicVisibilityUnlocked || busyAction !== null} onChange={(value) => void updateSetting("exchangeVisibilityEnabled", value)} />
          </div>
        </section>

        {summary.remaining > 0 && <InitialPopulationProvisioner />}

        <section className="mt-7 rounded-[30px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#7ee8ff]">Population Registry</p><h2 className="mt-2 text-3xl font-bold tracking-[-0.04em]">Agent population</h2></div>
            <div className="grid gap-2 sm:grid-cols-3">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search agents..." className="min-h-11 rounded-xl border border-white/10 bg-[#061632]/75 px-4 text-sm text-white outline-none placeholder:text-white/28" />
              <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value as FilterStatus)} className="min-h-11 rounded-xl border border-white/10 bg-[#061632] px-4 text-sm text-white"><option value="all">All statuses</option><option value="planned">Planned</option><option value="dormant">Dormant</option><option value="active">Active</option><option value="paused">Paused</option><option value="retired">Retired</option></select>
              <select value={filterWorld} onChange={(event) => setFilterWorld(event.target.value as FilterWorld)} className="min-h-11 rounded-xl border border-white/10 bg-[#061632] px-4 text-sm text-white"><option value="all">All worlds</option><option value="nova">Nova</option><option value="milo">Milo</option><option value="both">Both</option></select>
            </div>
          </div>

          <p className="mt-4 text-xs text-white/34">Showing {filteredAgents.length} of {overview.agents.length} agents</p>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/8">
            <table className="w-full min-w-[1260px] border-collapse text-left">
              <thead className="bg-[#061632]/90"><tr className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-white/40"><th className="px-4 py-4">Agent</th><th className="px-4 py-4">Identity</th><th className="px-4 py-4">Role / Education</th><th className="px-4 py-4">World</th><th className="px-4 py-4">Persona</th><th className="px-4 py-4">Economy</th><th className="px-4 py-4">Pilot</th><th className="px-4 py-4">Failures</th><th className="px-4 py-4">State</th></tr></thead>
              <tbody>
                {filteredAgents.map((agent) => (
                  <tr key={agent.agentCode} className="border-t border-white/[0.07] align-top hover:bg-white/[0.025]">
                    <td className="px-4 py-4"><strong className="block text-sm">{agent.agentCode}</strong><span className="mt-1 block font-mono text-[11px] text-cyan-100/45">{agent.internalHandle}</span></td>
                    <td className="px-4 py-4"><strong className="block text-sm">{agent.naturalName}</strong><span className="mt-1 block text-xs text-white/48">@{agent.username}</span></td>
                    <td className="px-4 py-4 text-xs"><strong className="capitalize">{agent.accountRole}</strong><span className="mt-1 block text-white/45">{agent.educationLevel || "General learner"} · Age {agent.syntheticAge}</span></td>
                    <td className="px-4 py-4 text-xs capitalize text-white/65">{agent.worldAffinity}</td>
                    <td className="px-4 py-4 text-xs text-white/65">{titleCase(agent.archetype)}</td>
                    <td className="px-4 py-4 text-xs"><strong className="block text-[#ffd18a]">{formatNumber(agent.currentDt ?? agent.startingDtTarget)} DT</strong><span className="mt-1 block text-violet-200/70">{formatNumber(agent.currentDg ?? agent.startingDgTarget)} DG</span></td>
                    <td className="px-4 py-4">{agent.pilotOrder ? <><strong className="text-xs text-cyan-100">#{agent.pilotOrder}</strong><span className="mt-1 block text-[10px] uppercase text-white/35">{agent.pilotStatus}</span></> : <span className="text-xs text-white/25">—</span>}</td>
                    <td className="px-4 py-4 text-xs text-white/55">{agent.consecutiveFailures} streak<span className="mt-1 block text-[10px] text-white/30">{agent.totalFailures} total</span></td>
                    <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] ${statusClasses(agent.lifecycleStatus)}`}>{titleCase(agent.lifecycleStatus)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-cyan-300/12 bg-cyan-300/[0.035] p-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-cyan-100">Phase 3A Safety State</p>
          <p className="mt-3 text-sm leading-6 text-white/48">The 10-agent pilot is staged but not active. The simulation clock has not started, runtime execution is disabled for every agent, real-world action contracts remain non-executable, and public visibility remains locked off.</p>
        </section>
      </div>
    </main>
  );
}
