"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type QaPlan = {
  ok: boolean;
  pilotOrder?: number;
  agentCode?: string;
  affinity?: string;
  accountRole?: string;
  actionKey?: string;
  target?: string;
  adapterKey?: string;
  expectedAccuracyPercent?: number;
  error?: string;
};

type QaPayload = {
  ok?: boolean;
  error?: string;
  failureId?: string | null;
  executionOccurred?: boolean;
  affinityCounts?: Record<string, number>;
  actionDistribution?: Record<string, number>;
  plans?: QaPlan[];
  globalChecks?: Record<string, boolean>;
};

function titleCase(value: string) {
  return value.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ExecutionQaPage() {
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<QaPayload | null>(null);

  async function runQa() {
    setLoading(true);
    setPayload(null);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session?.access_token) throw new Error("Please sign in again as an administrator.");

      const response = await fetch("/api/admin/agents/execution-qa", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json().catch(() => ({})) as QaPayload;
      setPayload(data);
    } catch (error) {
      setPayload({ ok: false, error: error instanceof Error ? error.message : "Execution adapter QA failed." });
    }
    setLoading(false);
  }

  const plans = payload?.plans || [];
  const checks = Object.entries(payload?.globalChecks || {});

  return (
    <main className="min-h-screen bg-[#020813] px-4 py-8 text-white sm:px-6">
      <section className="mx-auto max-w-7xl">
        <a href="/admin/agents" className="text-sm font-bold text-cyan-200 no-underline hover:text-white">← Agent Control Centre</a>

        <div className="mt-6 rounded-[30px] border border-cyan-200/14 bg-white/[0.045] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">DREAMSCAPE Agent Framework</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.045em]">Phase 3C · Execution Adapter QA</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-white/55">
            Validates a real safe execution payload for each of the 10 pilot agents without creating action requests or executing gameplay.
          </p>
          <div className="mt-6 rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-4 text-sm leading-6 text-amber-100/80">
            Readiness only · agents remain dormant · no DT/DG changes · no quiz attempts · no Rover runs · no action execution
          </div>
          <button type="button" disabled={loading} onClick={runQa} className="mt-6 min-h-12 rounded-2xl border border-cyan-200/25 bg-cyan-300/10 px-7 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/15 disabled:opacity-40">
            {loading ? "Checking 10 Agents…" : "Run 10-Agent Adapter QA"}
          </button>
        </div>

        {payload && (
          <>
            <section className="mt-6 rounded-[30px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">QA Result</p>
                  <h2 className={`mt-2 text-3xl font-black ${payload.ok ? "text-emerald-200" : "text-red-200"}`}>{payload.ok ? "PASS" : "CHECK REQUIRED"}</h2>
                </div>
                <p className="text-xs font-bold text-white/45">Execution occurred: {payload.executionOccurred ? "YES" : "NO"}</p>
              </div>

              {payload.error && (
                <div className="mt-5 rounded-2xl border border-red-300/20 bg-red-300/[0.06] p-4">
                  <p className="text-sm font-bold text-red-100">{payload.error}</p>
                  {payload.failureId && <p className="mt-2 text-xs text-red-100/50">Failure ID: {payload.failureId}</p>}
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

            {plans.length > 0 && (
              <section className="mt-6 overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.035]">
                <div className="border-b border-white/8 p-5 sm:p-6">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">Prepared Pilot Plans</p>
                  <h2 className="mt-2 text-2xl font-black">10-agent safe target check</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px] text-left text-xs">
                    <thead className="bg-white/[0.04] text-white/35"><tr>
                      <th className="px-4 py-3">Pilot</th><th className="px-4 py-3">Agent</th><th className="px-4 py-3">Affinity</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Prepared Action</th><th className="px-4 py-3">Target</th><th className="px-4 py-3">Expected Accuracy</th><th className="px-4 py-3">Adapter</th><th className="px-4 py-3">Status</th>
                    </tr></thead>
                    <tbody>
                      {plans.map((plan, index) => (
                        <tr key={`${plan.agentCode || "missing"}-${index}`} className="border-t border-white/[0.06]">
                          <td className="px-4 py-4">#{plan.pilotOrder ?? "—"}</td>
                          <td className="px-4 py-4 font-black">{plan.agentCode || "—"}</td>
                          <td className="px-4 py-4 capitalize text-white/55">{plan.affinity || "—"}</td>
                          <td className="px-4 py-4 capitalize text-white/55">{plan.accountRole || "—"}</td>
                          <td className="px-4 py-4 font-bold">{plan.actionKey ? titleCase(plan.actionKey) : "—"}</td>
                          <td className="px-4 py-4 text-white/55">{plan.target || plan.error || "—"}</td>
                          <td className="px-4 py-4 font-black text-[#ffd18a]">{plan.expectedAccuracyPercent === undefined ? "—" : `${plan.expectedAccuracyPercent}%`}</td>
                          <td className="px-4 py-4 text-[10px] text-white/40">{plan.adapterKey || "—"}</td>
                          <td className={`px-4 py-4 font-black ${plan.ok ? "text-emerald-200" : "text-red-200"}`}>{plan.ok ? "PASS" : "FAIL"}</td>
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
