"use client";

import { useMemo, useState } from "react";

import {
  PHASE4B_METHOD_FAMILIES,
  runPhase4B1CoverageAuditFromExport,
  toPhase4B1CompactExport,
  type Phase4B1CoverageAuditRun,
} from "../../../lib/math-intelligence/teaching/method-library";
import type { MathIntelligenceQaExportLike } from "../../../lib/math-intelligence/teaching/qa/types";

type Props = {
  qaExport: MathIntelligenceQaExportLike | null | undefined;
};

type FilterValue = "uncovered" | "covered" | "blocked" | "all";

function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
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
    tone === "good"
      ? "#9ad6b1"
      : tone === "warn"
        ? "#e7c86b"
        : tone === "bad"
          ? "#e7a3a3"
          : "#d7deea";
  const background =
    tone === "good"
      ? "#f4fff7"
      : tone === "warn"
        ? "#fffbed"
        : tone === "bad"
          ? "#fff5f5"
          : "#f8fafc";

  return (
    <div
      style={{
        border: `1px solid ${border}`,
        background,
        borderRadius: 12,
        padding: "12px 14px",
        minWidth: 132,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800, color: "#101828" }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "#5c667a", marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

function CheckRow({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "8px 0",
        borderBottom: "1px solid #edf0f5",
      }}
    >
      <span style={{ color: "#344054" }}>{label}</span>
      <strong style={{ color: passed ? "#18794e" : "#b42318" }}>
        {passed ? "PASS" : "FAIL"}
      </strong>
    </div>
  );
}

export default function Phase4B1MethodCoverageAudit({ qaExport }: Props) {
  const [run, setRun] = useState<Phase4B1CoverageAuditRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>("uncovered");
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
      if (filter === "uncovered") return item.coverageStatus === "uncovered";
      if (filter === "covered") return item.coverageStatus === "covered";
      return item.contractStatus === "blocked";
    });
  }, [run, filter, query]);

  function runAudit(): void {
    if (!qaExport) return;
    try {
      setError(null);
      setRun(runPhase4B1CoverageAuditFromExport(qaExport));
    } catch (caught) {
      setRun(null);
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function exportAudit(): void {
    if (!run) return;
    const suffix = run.sourceRunId?.slice(0, 8) ?? "unsaved";
    downloadJson(
      `phase-4b1-method-coverage-audit-${suffix}.json`,
      toPhase4B1CompactExport(run),
    );
  }

  return (
    <section
      style={{
        border: "1px solid #dfe5ee",
        borderRadius: 16,
        padding: 18,
        marginTop: 18,
        background: "#ffffff",
        color: "#101828",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "#667085",
            }}
          >
            PHASE 4B-1 · COVERAGE AUDIT & METHOD-FAMILY TAXONOMY
          </p>
          <h2 style={{ margin: "5px 0 6px", fontSize: 22, color: "#101828" }}>
            Teaching-method coverage map
          </h2>
          <p style={{ margin: 0, color: "#667085", maxWidth: 860 }}>
            Rebuilds the Phase 4A Teaching Contract, crosses only the locked 4B
            consumer boundary, and checks whether every pedagogy-ready question
            maps to at least one specific method family. This phase defines
            coverage only; it does not select a teaching method.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={runAudit}
            disabled={!canRun}
            style={{
              border: 0,
              borderRadius: 10,
              padding: "10px 14px",
              fontWeight: 800,
              cursor: canRun ? "pointer" : "not-allowed",
              background: canRun ? "#17345f" : "#c8ced8",
              color: "white",
            }}
          >
            Run 4B-1 Coverage Audit
          </button>
          <button
            type="button"
            onClick={exportAudit}
            disabled={!run}
            style={{
              border: "1px solid #cfd7e3",
              borderRadius: 10,
              padding: "10px 14px",
              fontWeight: 700,
              cursor: run ? "pointer" : "not-allowed",
              background: "white",
              color: "#101828",
              opacity: run ? 1 : 0.55,
            }}
          >
            Export 4B-1 JSON
          </button>
        </div>
      </div>

      {error ? (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 10,
            background: "#fff2f0",
            color: "#b42318",
          }}
        >
          {error}
        </div>
      ) : null}

      {run ? (
        <>
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 16,
            }}
          >
            <SummaryCard label="Cohort" value={run.cohortKind} />
            <SummaryCard label="Sample" value={run.summary.totalSampleItems} />
            <SummaryCard
              label="Ready for pedagogy"
              value={run.summary.readyForPedagogy}
              tone="good"
            />
            <SummaryCard
              label="Covered ready"
              value={run.summary.coveredReadyQuestions}
              tone={run.summary.uncoveredReadyQuestions === 0 ? "good" : "warn"}
            />
            <SummaryCard
              label="Uncovered ready"
              value={run.summary.uncoveredReadyQuestions}
              tone={run.summary.uncoveredReadyQuestions === 0 ? "good" : "bad"}
            />
            <SummaryCard
              label="Coverage"
              value={`${run.summary.coveragePercent}%`}
              tone={run.summary.coveragePercent === 100 ? "good" : "bad"}
            />
            <SummaryCard label="Structures" value={run.summary.uniqueStructures} />
            <SummaryCard label="Reasoning types" value={run.summary.uniqueReasoningFamilies} />
            <SummaryCard
              label="Method families used"
              value={run.summary.uniqueMethodFamiliesRequired}
            />
            <SummaryCard
              label="4B-1 gate"
              value={run.passed ? "PASS" : "FAIL"}
              tone={run.passed ? "good" : "bad"}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 18,
              marginTop: 18,
            }}
          >
            <div>
              <h3 style={{ margin: "0 0 8px", fontSize: 15, color: "#101828" }}>
                Coverage checks
              </h3>
              <CheckRow
                label="4B consumer boundary passes"
                passed={run.checks.phase4BConsumerBoundaryPasses}
              />
              <CheckRow
                label="Every ready question has method-family coverage"
                passed={run.checks.everyReadyQuestionCoveredByTaxonomy}
              />
              <CheckRow
                label="Every observed structure is mapped"
                passed={run.checks.everyObservedStructureMapped}
              />
              <CheckRow
                label="Every observed reasoning type is mapped"
                passed={run.checks.everyObservedReasoningMapped}
              />
              <CheckRow
                label="No generic fallback family"
                passed={run.checks.noGenericFallbackFamily}
              />
              <CheckRow
                label="All referenced family IDs are valid"
                passed={run.checks.allReferencedFamilyIdsKnown}
              />
            </div>

            <div>
              <h3 style={{ margin: "0 0 8px", fontSize: 15, color: "#101828" }}>
                Taxonomy status
              </h3>
              <div style={{ fontSize: 13, color: "#475467", lineHeight: 1.7 }}>
                <div>Taxonomy schema: {run.taxonomySchemaVersion}</div>
                <div>Defined method families: {PHASE4B_METHOD_FAMILIES.length}</div>
                <div>Observed domains: {run.summary.uniqueDomains}</div>
                <div>Blocked before 4B: {run.summary.blockedBeforePhase4B}</div>
                <div>4B consumer failures: {run.summary.phase4BConsumerFailures}</div>
                <div>Run: {run.sourceRunId ?? "—"}</div>
                <div>Seed: {run.sourceSeed ?? "—"}</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: 15, color: "#101828" }}>
                  Question coverage audit
                </h3>
                <div style={{ fontSize: 12, color: "#667085" }}>
                  {visibleResults.length} item(s) shown. Covered means the taxonomy
                  exposes legitimate method families; 4C will choose the best method later.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value as FilterValue)}
                  style={{
                    border: "1px solid #cfd7e3",
                    borderRadius: 8,
                    padding: "8px 10px",
                    background: "#ffffff",
                    color: "#101828",
                  }}
                >
                  <option value="uncovered">Uncovered ready</option>
                  <option value="covered">Covered ready</option>
                  <option value="blocked">Blocked before 4B</option>
                  <option value="all">All</option>
                </select>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search code or ID"
                  style={{
                    border: "1px solid #cfd7e3",
                    borderRadius: 8,
                    padding: "8px 10px",
                    background: "#ffffff",
                    color: "#101828",
                    minWidth: 180,
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {visibleResults.slice(0, 80).map((item) => (
                <div
                  key={`${item.questionId}-${item.questionCode}`}
                  style={{
                    border: "1px solid #e4e9f1",
                    borderRadius: 10,
                    padding: "10px 12px",
                    display: "grid",
                    gridTemplateColumns: "minmax(170px, 0.8fr) minmax(200px, 1fr) minmax(280px, 1.4fr)",
                    gap: 12,
                    alignItems: "start",
                    color: "#344054",
                    fontSize: 12,
                  }}
                >
                  <div>
                    <strong style={{ color: "#101828" }}>
                      {item.questionCode ?? item.questionId ?? "Unknown question"}
                    </strong>
                    <div style={{ color: "#667085", marginTop: 2 }}>
                      {item.learnerLevel ? `P${item.learnerLevel}` : "Unknown level"} · {item.coverageStatus}
                    </div>
                  </div>
                  <div>
                    <strong style={{ color: "#101828" }}>Primary families</strong>
                    <div style={{ marginTop: 3 }}>
                      {item.requirement?.primaryFamilies.join(", ") || "—"}
                    </div>
                  </div>
                  <div>
                    <strong style={{ color: "#101828" }}>
                      Supporting families / issues
                    </strong>
                    <div style={{ marginTop: 3 }}>
                      {item.coverageIssues.length
                        ? item.coverageIssues.map((issue) => issue.code).join(", ")
                        : item.requirement?.supportingFamilies.join(", ") || "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
