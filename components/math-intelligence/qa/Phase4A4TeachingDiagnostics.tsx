"use client";

import { useMemo, useState } from "react";

import {
  evaluatePhase4A4DiagnosticsFromExport,
  toPhase4A4CompactExport,
  type Phase4A4AdminClassification,
  type Phase4A4DiagnosticsRun,
} from "../../../lib/math-intelligence/teaching/contract/admin";
import type { MathIntelligenceQaExportLike } from "../../../lib/math-intelligence/teaching/qa/types";

type Props = {
  qaExport: MathIntelligenceQaExportLike | null | undefined;
};

type FilterValue = "attention" | "all" | Phase4A4AdminClassification | "answer_not_checked";

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
        minWidth: 135,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800, color: "#101828" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#5c667a", marginTop: 2 }}>{label}</div>
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

function classificationLabel(value: Phase4A4AdminClassification): string {
  switch (value) {
    case "ready_for_pedagogy":
      return "Ready for pedagogy";
    case "expected_understanding_block":
      return "Expected understanding block";
    case "source_data_review":
      return "Source-data review";
    case "contract_integrity_failure":
      return "Contract integrity failure";
  }
}

export default function Phase4A4TeachingDiagnostics({ qaExport }: Props) {
  const [run, setRun] = useState<Phase4A4DiagnosticsRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>("attention");
  const [query, setQuery] = useState("");

  const canRun = Boolean(qaExport?.sample?.items?.length);

  const visibleResults = useMemo(() => {
    if (!run) return [];
    const needle = query.trim().toLowerCase();

    return run.results.filter((item) => {
      const matchesQuery =
        !needle ||
        (item.questionCode ?? "").toLowerCase().includes(needle) ||
        (item.questionId ?? "").toLowerCase().includes(needle);
      if (!matchesQuery) return false;

      if (filter === "all") return true;
      if (filter === "attention") return item.attentionSeverity !== "none";
      if (filter === "answer_not_checked") {
        return item.answerValidationStatus === "not_checked";
      }
      return item.classification === filter;
    });
  }, [run, filter, query]);

  function runDiagnostics(): void {
    if (!qaExport) return;
    try {
      setError(null);
      setRun(evaluatePhase4A4DiagnosticsFromExport(qaExport));
    } catch (caught) {
      setRun(null);
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function exportDiagnostics(): void {
    if (!run) return;
    const suffix = run.sourceRunId?.slice(0, 8) ?? "unsaved";
    downloadJson(
      `phase-4a4-validation-admin-diagnostics-${suffix}.json`,
      toPhase4A4CompactExport(run),
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
            PHASE 4A-4 · VALIDATION & ADMIN DIAGNOSTICS
          </p>
          <h2 style={{ margin: "5px 0 6px", fontSize: 22, color: "#101828" }}>
            Phase 4A final gate
          </h2>
          <p style={{ margin: 0, color: "#667085", maxWidth: 820 }}>
            Rechecks the 4A-3 contract gate, validates both Phase 4B and 4C
            consumer boundaries, verifies the explicit internal-answer validation
            path, and separates source-data review candidates from engine failures.
            This panel never rewrites curriculum mappings.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={runDiagnostics}
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
            Run 4A-4 Final Gate
          </button>
          <button
            type="button"
            onClick={exportDiagnostics}
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
            Export 4A-4 JSON
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
            <SummaryCard label="Total" value={run.summary.total} />
            <SummaryCard
              label="Ready for pedagogy"
              value={run.summary.readyForPedagogy}
              tone="good"
            />
            <SummaryCard
              label="Expected blocked"
              value={run.summary.expectedUnderstandingBlocked}
            />
            <SummaryCard
              label="Source-data review"
              value={run.summary.sourceDataReviewCandidates}
              tone={run.summary.sourceDataReviewCandidates > 0 ? "warn" : "neutral"}
            />
            <SummaryCard
              label="Contract failures"
              value={run.summary.contractIntegrityFailures}
              tone={run.summary.contractIntegrityFailures === 0 ? "good" : "bad"}
            />
            <SummaryCard
              label="4B boundary failures"
              value={run.summary.phase4BConsumerFailures}
              tone={run.summary.phase4BConsumerFailures === 0 ? "good" : "bad"}
            />
            <SummaryCard
              label="4C boundary failures"
              value={run.summary.phase4CConsumerFailures}
              tone={run.summary.phase4CConsumerFailures === 0 ? "good" : "bad"}
            />
            <SummaryCard
              label="Final gate"
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
              <h3 style={{ margin: "0 0 8px", fontSize: 15, color: "#101828" }}>Final acceptance checks</h3>
              <CheckRow label="4A-3 cohort QA still passes" passed={run.checks.phase4A3CohortQaStillPasses} />
              <CheckRow label="Every ready contract validates" passed={run.checks.everyReadyContractValidates} />
              <CheckRow label="Every ready contract reaches 4B" passed={run.checks.everyReadyContractReachesPhase4B} />
              <CheckRow label="Every ready contract reaches 4C" passed={run.checks.everyReadyContractReachesPhase4C} />
              <CheckRow label="Internal validation path available" passed={run.checks.internalValidationPathAvailableForEveryReadyContract} />
              <CheckRow label="No ready answer mismatch" passed={run.checks.noReadyAnswerMismatch} />
              <CheckRow label="No missing question IDs" passed={run.checks.noMissingQuestionIds} />
              <CheckRow label="Blocked questions remain blocked" passed={run.checks.blockedQuestionsRemainBlocked} />
              <CheckRow label="Source-data issues separated from engine failures" passed={run.checks.sourceDataIssuesSeparatedFromEngineFailures} />
            </div>

            <div>
              <h3 style={{ margin: "0 0 8px", fontSize: 15, color: "#101828" }}>Admin notes</h3>
              <div style={{ fontSize: 13, color: "#475467", lineHeight: 1.7 }}>
                <div>Run: {run.sourceRunId ?? "—"}</div>
                <div>Seed: {run.sourceSeed ?? "—"}</div>
                <div>Contract schema: {run.contractSchemaVersion}</div>
                <div>Consumer schema: {run.consumerSchemaVersion}</div>
                <div>Answer not checked: {run.summary.answerNotChecked}</div>
                <div>Ready answer mismatches: {run.summary.readyAnswerMismatches}</div>
                <div>Internal-validation failures: {run.summary.internalValidationFailures}</div>
                <div>Missing IDs: {run.summary.missingQuestionIds}</div>
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
                <h3 style={{ margin: "0 0 4px", fontSize: 15, color: "#101828" }}>Admin diagnostic queue</h3>
                <div style={{ fontSize: 12, color: "#667085" }}>
                  {visibleResults.length} item(s) shown. Source-data review is a warning queue, not an engine failure.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value as FilterValue)}
                  style={{ border: "1px solid #cfd7e3", borderRadius: 8, padding: "8px 10px", background: "#ffffff", color: "#101828" }}
                >
                  <option value="attention">Needs attention</option>
                  <option value="all">All questions</option>
                  <option value="ready_for_pedagogy">Ready for pedagogy</option>
                  <option value="expected_understanding_block">Expected understanding block</option>
                  <option value="source_data_review">Source-data review</option>
                  <option value="contract_integrity_failure">Contract integrity failure</option>
                  <option value="answer_not_checked">Answer not checked</option>
                </select>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Question code / ID"
                  style={{ border: "1px solid #cfd7e3", borderRadius: 8, padding: "8px 10px", minWidth: 190, background: "#ffffff", color: "#101828" }}
                />
              </div>
            </div>

            <div style={{ maxHeight: 390, overflow: "auto", marginTop: 10 }}>
              {visibleResults.map((item, index) => (
                <div
                  key={item.questionId ?? item.questionCode ?? `diag-${index}`}
                  style={{
                    padding: "10px 0",
                    borderTop: "1px solid #edf0f5",
                    fontSize: 12,
                    display: "grid",
                    gridTemplateColumns: "minmax(180px, 1.2fr) minmax(170px, 1fr) 2fr",
                    gap: 12,
                  }}
                >
                  <div>
                    <strong style={{ color: "#101828" }}>{item.questionCode ?? item.questionId ?? "Unknown"}</strong>
                    <div style={{ color: "#667085", marginTop: 2 }}>
                      P{item.learnerLevel ?? "?"} · {item.contractStatus}
                    </div>
                  </div>
                  <div>
                    <strong style={{ color: "#101828" }}>{classificationLabel(item.classification)}</strong>
                    <div style={{ color: item.attentionSeverity === "blocking" ? "#b42318" : "#667085", marginTop: 2 }}>
                      {item.attentionSeverity}
                    </div>
                  </div>
                  <div style={{ color: "#475467" }}>
                    {item.sourceDataReviewCandidate?.reason ??
                      (item.diagnosticCodes.length > 0
                        ? item.diagnosticCodes.join(", ")
                        : "No diagnostic issue.")}
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
