"use client";

import { useMemo, useState } from "react";

import {
  runPhase4A3QaFromExport,
  toPhase4A3CompactExport,
} from "../../../lib/math-intelligence/teaching/contract/qa";
import type {
  MathIntelligenceQaExportLike,
} from "../../../lib/math-intelligence/teaching/qa/types";
import type {
  Phase4A3QaRun,
} from "../../../lib/math-intelligence/teaching/contract/qa";

type Props = {
  qaExport: MathIntelligenceQaExportLike | null | undefined;
};

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
        minWidth: 130,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800, color: "#101828" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#5c667a", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function CheckRow({
  label,
  passed,
}: {
  label: string;
  passed: boolean;
}) {
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

export default function Phase4A3TeachingContractQA({ qaExport }: Props) {
  const [run, setRun] = useState<Phase4A3QaRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canRun = Boolean(qaExport?.sample?.items?.length);

  const failedResults = useMemo(
    () =>
      run?.results.filter(
        (item) =>
          !item.deterministic ||
          !item.validationPassed ||
          item.sourceUnderstandingReadyForMethodSelection !==
            (item.contractStatus === "ready"),
      ) ?? [],
    [run],
  );

  function runQa(): void {
    if (!qaExport) return;

    try {
      setError(null);
      setRun(runPhase4A3QaFromExport(qaExport));
    } catch (caught) {
      setRun(null);
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function exportQa(): void {
    if (!run) return;
    const suffix = run.sourceRunId?.slice(0, 8) ?? "unsaved";
    downloadJson(
      `phase-4a3-2-teaching-contract-qa-${suffix}.json`,
      toPhase4A3CompactExport(run),
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
            PHASE 4A-3.2 · CONTRACT COHORT QA & INTEGRATION
          </p>
          <h2 style={{ margin: "5px 0 6px", fontSize: 22, color: "#101828" }}>
            Teaching Contract QA
          </h2>
          <p style={{ margin: 0, color: "#667085", maxWidth: 760 }}>
            Rebuilds the 4A-2.4 understanding from the current QA sample, creates
            4A-3.1 contracts only for gate-approved questions, then checks exact
            cohort counts, contract validity, answer isolation and deterministic
            output.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={runQa}
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
            Run 4A-3.2 Contract QA
          </button>
          <button
            type="button"
            onClick={exportQa}
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
            Export 4A-3.2 JSON
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
              label="Ready contracts"
              value={run.summary.readyContracts}
              tone="good"
            />
            <SummaryCard
              label="Blocked"
              value={run.summary.blockedContracts}
              tone="neutral"
            />
            <SummaryCard
              label="Invalid ready"
              value={run.summary.invalidReadyContracts}
              tone={run.summary.invalidReadyContracts === 0 ? "good" : "bad"}
            />
            <SummaryCard
              label="Determinism failures"
              value={run.summary.determinismFailures}
              tone={run.summary.determinismFailures === 0 ? "good" : "bad"}
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
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 18,
              marginTop: 18,
            }}
          >
            <div>
              <h3 style={{ margin: "0 0 8px", fontSize: 15, color: "#101828" }}>Acceptance checks</h3>
              <CheckRow
                label="Expected cohort total"
                passed={run.checks.totalMatchesExpectation}
              />
              <CheckRow
                label="Expected ready-contract count"
                passed={run.checks.readyCountMatchesExpectation}
              />
              <CheckRow
                label="Expected blocked-contract count"
                passed={run.checks.blockedCountMatchesExpectation}
              />
              <CheckRow
                label="40 questions per level"
                passed={run.checks.levelBalanceMatchesExpectation}
              />
              <CheckRow
                label="Every ready contract validates"
                passed={run.checks.allReadyContractsValidate}
              />
              <CheckRow
                label="Builder is deterministic"
                passed={run.checks.allBuildsDeterministic}
              />
              <CheckRow
                label="4A-2 gate matches contract status"
                passed={run.checks.sourceGateMatchesContractStatus}
              />
              <CheckRow
                label="No learner answer leakage"
                passed={run.checks.noLearnerAnswerLeak}
              />
              <CheckRow
                label="No premature teaching method"
                passed={run.checks.noPrematureTeachingMethod}
              />
            </div>

            <div>
              <h3 style={{ margin: "0 0 8px", fontSize: 15, color: "#101828" }}>Locked expectation</h3>
              <div style={{ fontSize: 13, color: "#475467", lineHeight: 1.7 }}>
                <div>Seed: {run.sourceSeed ?? "—"}</div>
                <div>Run: {run.sourceRunId ?? "—"}</div>
                <div>
                  Expected ready: {run.expectation.readyContracts ?? "custom"}
                </div>
                <div>
                  Expected blocked: {run.expectation.blockedContracts ?? "custom"}
                </div>
                <div>
                  Source ready understandings: {run.summary.sourceReadyUnderstandings}
                </div>
                <div>
                  Source/contract mismatches: {run.summary.sourceGateContractMismatches}
                </div>
                <div>Answer leaks: {run.summary.learnerAnswerLeakFailures}</div>
                <div>Premature methods: {run.summary.prematureMethodFailures}</div>
              </div>
            </div>
          </div>

          {failedResults.length > 0 ? (
            <div style={{ marginTop: 18 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 15, color: "#101828" }}>
                Contract QA failures
              </h3>
              <div style={{ maxHeight: 260, overflow: "auto" }}>
                {failedResults.map((item, index) => (
                  <div
                    key={item.questionId ?? item.questionCode ?? `failure-${index}`}
                    style={{
                      borderTop: "1px solid #edf0f5",
                      padding: "8px 0",
                      fontSize: 12,
                    }}
                  >
                    <strong style={{ color: "#101828" }}>{item.questionCode ?? item.questionId ?? "Unknown"}</strong>
                    <span style={{ marginLeft: 8, color: "#667085" }}>
                      {item.contractStatus} · deterministic={String(item.deterministic)} ·
                      validation={String(item.validationPassed)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
