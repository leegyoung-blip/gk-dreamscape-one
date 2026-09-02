"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type CheckMap = Record<string, boolean>;

type SessionPlan = {
  sessionNumber: number;
  dueMinute: number;
  plannedDecisions: number;
};

type PilotPlan = {
  pilotOrder: number;
  agentCode: string;
  naturalName: string;
  worldAffinity: string;
  lifecycleStatus: string;
  deterministic: boolean;
  plan: {
    simulationDayIndex: number;
    sessionCount: number;
    sessions: SessionPlan[];
  };
};

type Payload = {
  ok?: boolean;
  error?: string;
  failureId?: string;
  executionOccurred?: boolean;
  databaseMutationOccurred?: boolean;
  scheduleChecks?: CheckMap;
  safetyChecks?: CheckMap;
  plans?: PilotPlan[];
  counts?: Record<string, number>;
};

function titleCase(value: string) {
  return value.replace(/[._-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function OrchestratorQaPage() {
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<Payload | null>(null);

  async function runQa() {
    setLoading(true);
    setPayload(null);

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session?.access_token) throw new Error("Please sign in again as an administrator.");

      const response = await fetch("/api/admin/agents/orchestrator-qa", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const result = (await response.json().catch(() => ({}))) as Payload;
      setPayload(result);
    } catch (error) {
      setPayload({ ok: false, error: error instanceof Error ? error.message : "Orchestrator QA failed." });
    }

    setLoading(false);
  }

  const checks = [
    ...Object.entries(payload?.scheduleChecks || {}),
    ...Object.entries(payload?.safetyChecks || {}),
  ];

  return (
    <main className="min-h-screen bg-[#020813] px-4 py-8 text-white sm:px-6">
      <section className="mx-auto max-w-7xl">
        <a href="/admin/agents" className="text-sm font-bold text-cyan-200 no-underline hover:text-white">
          ← Agent Control Centre
        </a>

        <div className="mt-6 rounded-[30px] border border-cyan-200/14 bg-white/[0.045] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">DREAMSCAPE Agent Framework</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.045em]">Phase 3D · OrchestratorV1 QA</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-white/55">
            Validates deterministic session scheduling, the repaired action-request boundary, runtime gates and the complete OrchestratorV1 dispatch chain without starting the simulation.
          </p>

          <div className="mt-6 rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-4 text-sm leading-6 text-amber-100/80">
            Readiness only · agents stay dormant · simulation clock stays off · contracts stay locked · no sessions, budgets, action requests or gameplay are created
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={runQa}
            className="mt-6 min-h-12 rounded-2xl border border-cyan-200/25 bg-cyan-300/10 px-7 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/15 disabled:opacity-40"
          >
            {loading ? "Checking OrchestratorV1…" : "Run Phase 3D Orchestrator QA"}
          </button>
        </div>

        {payload && (
          <>
            <section className="mt-6 rounded-[30px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">QA Result</p>
                  <h2 className={`mt-2 text-3xl font-black ${payload.ok ? "text-emerald-200" : "text-red-200"}`}>
                    {payload.ok ? "PASS" : "CHECK REQUIRED"}
                  </h2>
                </div>
                <div className="text-right text-xs font-bold text-white/45">
                  <div>Execution occurred: {payload.executionOccurred ? "YES" : "NO"}</div>
                  <div>Database mutation: {payload.databaseMutationOccurred ? "YES" : "NO"}</div>
                </div>
              </div>

              {payload.error && (
                <div className="mt-5 rounded-2xl border border-red-300/20 bg-red-300/[0.06] p-4 text-sm text-red-100">
                  <div className="font-black">{payload.error}</div>
                  {payload.failureId && <div className="mt-2 break-all text-xs text-red-100/45">Failure ID: {payload.failureId}</div>}
                </div>
              )}

              {checks.length > 0 && (
                <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {checks.map(([key, value]) => (
                    <div key={key} className={`rounded-2xl border p-3 ${value ? "border-emerald-300/12 bg-emerald-300/[0.04]" : "border-red-300/18 bg-red-300/[0.05]"}`}>
                      <span className="text-[10px] font-black uppercase tracking-[0.1em] text-white/38">{titleCase(key)}</span>
                      <strong className={`mt-1 block text-sm ${value ? "text-emerald-100" : "text-red-100"}`}>{value ? "PASS" : "FAIL"}</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {(payload.plans || []).length > 0 && (
              <section className="mt-6 overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.035]">
                <div className="border-b border-white/8 p-5 sm:p-6">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">Simulation Day 0 Schedule Preview</p>
                  <h2 className="mt-2 text-2xl font-black">Deterministic 10-agent cadence</h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-xs">
                    <thead className="bg-white/[0.04] text-white/35">
                      <tr>
                        <th className="px-4 py-3">Pilot</th>
                        <th className="px-4 py-3">Agent</th>
                        <th className="px-4 py-3">Affinity</th>
                        <th className="px-4 py-3">Sessions</th>
                        <th className="px-4 py-3">Schedule</th>
                        <th className="px-4 py-3">Deterministic</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(payload.plans || []).map((item) => (
                        <tr key={item.agentCode} className="border-t border-white/[0.06]">
                          <td className="px-4 py-4">#{item.pilotOrder}</td>
                          <td className="px-4 py-4">
                            <div className="font-black">{item.agentCode}</div>
                            <div className="mt-1 text-white/40">{item.naturalName}</div>
                          </td>
                          <td className="px-4 py-4 capitalize text-white/55">{item.worldAffinity}</td>
                          <td className="px-4 py-4 font-black text-[#ffd18a]">{item.plan.sessionCount}</td>
                          <td className="px-4 py-4 text-white/55">
                            {item.plan.sessions.map((session) => (
                              <div key={session.sessionNumber} className="whitespace-nowrap">
                                S{session.sessionNumber}: minute {session.dueMinute} · {session.plannedDecisions} decisions
                              </div>
                            ))}
                          </td>
                          <td className={`px-4 py-4 font-black ${item.deterministic ? "text-emerald-200" : "text-red-200"}`}>
                            {item.deterministic ? "YES" : "NO"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  );
}
