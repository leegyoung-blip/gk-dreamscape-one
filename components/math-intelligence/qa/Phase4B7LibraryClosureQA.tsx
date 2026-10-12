"use client";

import { useMemo, useState } from "react";

import {
  runPhase4B7LibraryClosureAuditFromExport,
  toPhase4B7CompactExport,
  type Phase4B7ClosureRun,
} from "../../../lib/math-intelligence/teaching/method-library";
import type { MathIntelligenceQaExportLike } from "../../../lib/math-intelligence/teaching/qa/types";

type Props = {
  qaExport: MathIntelligenceQaExportLike | null | undefined;
};

type FilterValue = "issues" | "no_candidate" | "no_primary" | "ready" | "blocked" | "all";

function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function SummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "good" | "warn" | "bad" | "neutral";
}) {
  const border =
    tone === "good" ? "#9ad6b1" : tone === "warn" ? "#e7c86b" : tone === "bad" ? "#e7a3a3" : "#d7deea";
  const background =
    tone === "good" ? "#f4fff7" : tone === "warn" ? "#fffbed" : tone === "bad" ? "#fff5f5" : "#f8fafc";

  return (
    <div style={{ border: `1px solid ${border}`, background, borderRadius: 12, padding: "12px 14px", minWidth: 138 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#101828" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#5c667a", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function CheckRow({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid #edf0f5" }}>
      <span style={{ color: "#344054" }}>{label}</span>
      <strong style={{ color: passed ? "#18794e" : "#b42318" }}>{passed ? "PASS" : "FAIL"}</strong>
    </div>
  );
}

export default function Phase4B7LibraryClosureQA({ qaExport }: Props) {
  const [run, setRun] = useState<Phase4B7ClosureRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>("issues");
  const [query, setQuery] = useState("");

  const canRun = Boolean(qaExport?.sample?.items?.length);

  const visibleResults = useMemo(() => {
    if (!run) return [];
    const needle = query.trim().toLowerCase();
    return run.results.filter((item) => {
      if (
        needle &&
        !(item.questionCode ?? "").toLowerCase().includes(needle) &&
        !(item.questionId ?? "").toLowerCase().includes(needle)
      ) {
        return false;
      }

      if (filter === "all") return true;
      if (filter === "issues") return item.issueCodes.length > 0;
      if (filter === "no_candidate") return item.issueCodes.includes("NO_PRODUCTION_CANDIDATE");
      if (filter === "no_primary") return item.issueCodes.includes("NO_PRIMARY_FAMILY_CANDIDATE");
      if (filter === "ready") return item.contractStatus === "ready";
      return item.contractStatus === "blocked";
    });
  }, [run, filter, query]);

  function runAudit(): void {
    if (!qaExport) return;
    try {
      setError(null);
      setRun(runPhase4B7LibraryClosureAuditFromExport(qaExport));
    } catch (caught) {
      setRun(null);
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function exportAudit(): void {
    if (!run) return;
    const suffix = run.sourceRunId?.slice(0, 8) ?? "unsaved";
    downloadJson(`phase-4b7-library-closure-${suffix}.json`, toPhase4B7CompactExport(run));
  }

  return (
    <section style={{ border: "1px solid #dfe5ee", borderRadius: 16, padding: 18, marginTop: 18, background: "#ffffff", color: "#101828" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#667085" }}>
            PHASE 4B-7 · FULL METHOD LIBRARY COVERAGE & CLOSURE
          </p>
          <h2 style={{ margin: "5px 0 6px", fontSize: 22, color: "#101828" }}>
            Complete Phase 4B closure gate
          </h2>
          <p style={{ margin: 0, color: "#667085", maxWidth: 1040, lineHeight: 1.5 }}>
            Rebuilds the locked Phase 4A Teaching Contracts, crosses the 4B consumer boundary, verifies the complete production method library,
            and checks that every pedagogy-ready question has at least one applicable production candidate from a primary method family.
            It still does not rank or select the final method; that begins in Phase 4C.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={runAudit} disabled={!canRun} style={{
            border: 0,
            borderRadius: 10,
            padding: "10px 14px",
            fontWeight: 800,
            cursor: canRun ? "pointer" : "not-allowed",
            background: canRun ? "#17345f" : "#c8ced8",
            color: "#ffffff",
          }}>
            Run 4B-7 Closure Gate
          </button>
          <button type="button" onClick={exportAudit} disabled={!run} style={{
            border: "1px solid #cfd7e3",
            borderRadius: 10,
            padding: "10px 14px",
            fontWeight: 700,
            cursor: run ? "pointer" : "not-allowed",
            background: "#ffffff",
            color: "#101828",
            opacity: run ? 1 : 0.55,
          }}>
            Export 4B-7 JSON
          </button>
        </div>
      </div>

      {error ? (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: "#fff2f0", color: "#b42318" }}>{error}</div>
      ) : null}

      {run ? (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
            <SummaryCard label="Cohort" value={run.cohortKind} />
            <SummaryCard label="Sample" value={run.summary.totalSampleItems} />
            <SummaryCard label="Ready for pedagogy" value={run.summary.readyForPedagogy} tone="good" />
            <SummaryCard label="Production methods" value={run.summary.totalProductionMethods} tone={run.summary.invalidProductionMethods === 0 ? "good" : "bad"} />
            <SummaryCard label="Families" value={`${run.summary.familiesWithProductionMethods}/${run.summary.taxonomyFamilies}`} tone={run.summary.familiesWithProductionMethods === run.summary.taxonomyFamilies ? "good" : "bad"} />
            <SummaryCard label="Ready with candidates" value={run.summary.readyWithCandidateMethods} tone={run.summary.readyWithoutCandidateMethods === 0 ? "good" : "bad"} />
            <SummaryCard label="No candidate" value={run.summary.readyWithoutCandidateMethods} tone={run.summary.readyWithoutCandidateMethods === 0 ? "good" : "bad"} />
            <SummaryCard label="No primary candidate" value={run.summary.readyWithoutPrimaryFamilyCandidate} tone={run.summary.readyWithoutPrimaryFamilyCandidate === 0 ? "good" : "bad"} />
            <SummaryCard label="Avg candidates" value={run.summary.averageCandidatesPerReadyQuestion} />
            <SummaryCard label="4B closure gate" value={run.passed ? "PASS" : "FAIL"} tone={run.passed ? "good" : "bad"} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18, marginTop: 18 }}>
            <div>
              <h3 style={{ margin: "0 0 8px", fontSize: 15, color: "#101828" }}>Final closure checks</h3>
              {Object.entries(run.checks).map(([key, passed]) => <CheckRow key={key} label={key} passed={passed} />)}
            </div>
            <div>
              <h3 style={{ margin: "0 0 8px", fontSize: 15, color: "#101828" }}>Prior 4B regressions</h3>
              {Object.entries(run.priorPhaseChecks).map(([key, passed]) => <CheckRow key={key} label={key} passed={passed} />)}
              <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "#f8fafc", color: "#475467", fontSize: 12, lineHeight: 1.5 }}>
                Candidate count range for ready questions: <strong style={{ color: "#101828" }}>{run.summary.minCandidatesPerReadyQuestion}–{run.summary.maxCandidatesPerReadyQuestion}</strong>.
                Phase 4C will rank these candidates; 4B-7 only proves that legitimate production methods are available.
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <select value={filter} onChange={(event) => setFilter(event.target.value as FilterValue)} style={{ border: "1px solid #cfd7e3", borderRadius: 9, padding: "8px 10px", background: "#ffffff", color: "#101828" }}>
              <option value="issues">Issues only</option>
              <option value="no_candidate">No production candidate</option>
              <option value="no_primary">No primary-family candidate</option>
              <option value="ready">All ready</option>
              <option value="blocked">Blocked before 4B</option>
              <option value="all">All</option>
            </select>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Question code or ID" style={{ border: "1px solid #cfd7e3", borderRadius: 9, padding: "8px 10px", background: "#ffffff", color: "#101828", minWidth: 230 }} />
            <span style={{ color: "#667085", fontSize: 12 }}>{visibleResults.length} shown</span>
          </div>

          <div style={{ overflowX: "auto", marginTop: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1050 }}>
              <thead>
                <tr>
                  <th style={th}>Question</th>
                  <th style={th}>Level</th>
                  <th style={th}>Contract</th>
                  <th style={th}>Primary families</th>
                  <th style={th}>Candidates</th>
                  <th style={th}>Primary candidates</th>
                  <th style={th}>Issues</th>
                </tr>
              </thead>
              <tbody>
                {visibleResults.map((item, index) => (
                  <tr key={`${item.questionId ?? "unknown"}-${index}`}>
                    <td style={td}><strong style={{ color: "#101828" }}>{item.questionCode ?? item.questionId ?? "unknown"}</strong></td>
                    <td style={td}>{item.learnerLevel ? `P${item.learnerLevel}` : "—"}</td>
                    <td style={td}>{item.contractStatus}</td>
                    <td style={td}>{item.primaryFamilies.join(", ") || "—"}</td>
                    <td style={td}>{item.candidateMethodIds.length}</td>
                    <td style={td}>{item.primaryCandidateMethodIds.length}</td>
                    <td style={td}>
                      <strong style={{ color: item.issueCodes.length === 0 ? "#18794e" : "#b42318" }}>
                        {item.issueCodes.length === 0 ? "None" : item.issueCodes.join(", ")}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div style={{ marginTop: 16, padding: 14, borderRadius: 10, background: "#f8fafc", color: "#667085" }}>
          Run this closure gate once on the fixed 4AAABC72 cohort and once on the excluded B2ACE146 holdout cohort. Both exports must pass before Phase 4B is closed.
        </div>
      )}
    </section>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 9px",
  fontSize: 11,
  color: "#475467",
  borderBottom: "1px solid #dfe5ee",
};

const td: React.CSSProperties = {
  padding: "8px 9px",
  fontSize: 12,
  color: "#344054",
  borderBottom: "1px solid #edf0f5",
  verticalAlign: "top",
};
