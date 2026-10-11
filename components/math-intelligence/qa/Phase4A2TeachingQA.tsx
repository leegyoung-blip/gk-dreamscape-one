"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  evaluatePhase4A2C5Closure,
  PHASE4A2C5_FIXED_SEED,
  runPhase4A2QaFromExport,
  toPhase4A2C5BaselineSnapshot,
  toPhase4A2CompactExport,
} from "../../../lib/math-intelligence/teaching";

import type {
  MathIntelligenceQaExportLike,
  Phase4A2C5BaselineSnapshot,
  Phase4A2C5ClosureReport,
  Phase4A2QaItem,
  Phase4A2QaRun,
} from "../../../lib/math-intelligence/teaching";

const C5_BASELINE_STORAGE_KEY = "dreamscape.phase4a2c5.fixed-baseline.v1";

type Props = {
  qaExport:
    | MathIntelligenceQaExportLike
    | null
    | undefined;
};

type StatusFilter =
  | "all"
  | "ready"
  | "partial"
  | "needs_review";

function downloadJson(
  filename: string,
  value: unknown,
): void {
  const blob = new Blob(
    [JSON.stringify(value, null, 2)],
    { type: "application/json" },
  );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function statusLabel(
  status: Phase4A2QaItem[
    "understanding"
  ]["status"],
): string {
  if (status === "needs_review") {
    return "Needs review";
  }

  if (status === "partial") {
    return "Partial";
  }

  return "Ready";
}

function StatusPill({
  status,
}: {
  status: Phase4A2QaItem[
    "understanding"
  ]["status"];
}) {
  return (
    <span
      className={`phase4a2b-status phase4a2b-status--${status}`}
    >
      {statusLabel(status)}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?:
    | "good"
    | "warn"
    | "bad"
    | "neutral";
}) {
  return (
    <div
      className={`phase4a2b-summary-card phase4a2b-summary-card--${tone}`}
    >
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Breakdown({
  title,
  values,
  onSelect,
  selected,
}: {
  title: string;
  values: Record<string, number>;
  onSelect?: (key: string) => void;
  selected?: string | null;
}) {
  const entries =
    Object.entries(values).sort(
      (a, b) => b[1] - a[1],
    );

  return (
    <div className="phase4a2b-breakdown">
      <h4>{title}</h4>

      {entries.length === 0 ? (
        <p className="phase4a2b-muted">
          No data.
        </p>
      ) : (
        <div className="phase4a2b-breakdown-list">
          {entries.map(
            ([key, value]) =>
              onSelect ? (
                <button
                  type="button"
                  className={`phase4a2b-breakdown-row phase4a2b-breakdown-button ${
                    selected === key
                      ? "phase4a2b-breakdown-row--selected"
                      : ""
                  }`}
                  key={key}
                  onClick={() =>
                    onSelect(key)
                  }
                >
                  <span>{key}</span>
                  <strong>{value}</strong>
                </button>
              ) : (
                <div
                  className="phase4a2b-breakdown-row"
                  key={key}
                >
                  <span>{key}</span>
                  <strong>{value}</strong>
                </div>
              ),
          )}
        </div>
      )}
    </div>
  );
}

function QuestionDetail({
  item,
}: {
  item: Phase4A2QaItem;
}) {
  const u =
    item.understanding;

  return (
    <div className="phase4a2b-detail">
      <section>
        <h5>Curriculum context</h5>
        <dl>
          <div>
            <dt>Topic</dt>
            <dd>
              {u.curriculumContext
                .topic ?? "—"}
            </dd>
          </div>
          <div>
            <dt>Skill</dt>
            <dd>
              {u.curriculumContext
                .primarySkill ??
                u.curriculumContext
                  .legacySkill ??
                "—"}
            </dd>
          </div>
          <div>
            <dt>
              Curriculum domain
            </dt>
            <dd>
              {
                u.curriculumContext
                  .inferredDomain
              }
            </dd>
          </div>
          <div>
            <dt>
              Selected evidence source
            </dt>
            <dd>
              {u.curriculumContext.selectedSource}
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h5>
          Existing Math Intelligence
        </h5>
        <dl>
          <div>
            <dt>Domain</dt>
            <dd>
              {item.existingProposal
                .domain ?? "—"}
            </dd>
          </div>
          <div>
            <dt>
              Problem structure
            </dt>
            <dd>
              {item.existingProposal
                .problemStructure ??
                "—"}
            </dd>
          </div>
          <div>
            <dt>Target</dt>
            <dd>
              {item.existingProposal
                .targetLabel ?? "—"}
            </dd>
          </div>
          <div>
            <dt>Confidence</dt>
            <dd>
              {item.existingProposal
                .confidence ?? "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h5>
          4A-2.4 Diagnostics & Gate
        </h5>
        <dl>
          <div>
            <dt>Domain</dt>
            <dd>{u.domain}</dd>
          </div>
          <div>
            <dt>
              Problem structure
            </dt>
            <dd>
              {u.problemStructure}
            </dd>
          </div>
          <div>
            <dt>Target</dt>
            <dd>
              {u.target
                ? `${u.target.kind}: ${
                    u.target.label ??
                    "—"
                  }`
                : "—"}
            </dd>
          </div>
          <div>
            <dt>Confidence</dt>
            <dd>
              {Math.round(
                u.confidence * 100,
              )}
              %
            </dd>
          </div>
          <div>
            <dt>4C gate</dt>
            <dd>
              {u.readyForMethodSelection
                ? "READY"
                : "BLOCKED"}
            </dd>
          </div>
          <div>
            <dt>Domain resolution</dt>
            <dd>{u.resolution.domain}</dd>
          </div>
          <div>
            <dt>Structure resolution</dt>
            <dd>{u.resolution.structure}</dd>
          </div>
          <div>
            <dt>Reasoning resolution</dt>
            <dd>{u.resolution.reasoning}</dd>
          </div>
          <div>
            <dt>Domain confidence</dt>
            <dd>{Math.round(u.confidenceBreakdown.domain * 100)}%</dd>
          </div>
          <div>
            <dt>Structure confidence</dt>
            <dd>{Math.round(u.confidenceBreakdown.structure * 100)}%</dd>
          </div>
          <div>
            <dt>Reasoning confidence</dt>
            <dd>{Math.round(u.confidenceBreakdown.reasoning * 100)}%</dd>
          </div>
        </dl>
      </section>

      <section>
        <h5>Required reasoning</h5>

        <div className="phase4a2b-tags">
          {u.requiredReasoning.map(
            (reasoning) => (
              <span key={reasoning}>
                {reasoning}
              </span>
            ),
          )}
        </div>
      </section>

      <section>
        <h5>Quantities</h5>

        {u.quantities.length === 0 ? (
          <p className="phase4a2b-muted">
            No deterministic quantities
            extracted.
          </p>
        ) : (
          <div className="phase4a2b-tags">
            {u.quantities.map(
              (quantity) => (
                <span key={quantity.id}>
                  {quantity.raw}
                  {quantity.unit
                    ? ` [${quantity.unit}]`
                    : ""}
                </span>
              ),
            )}
          </div>
        )}
      </section>

      <section>
        <h5>Relationships</h5>

        {u.relationships.length ===
        0 ? (
          <p className="phase4a2b-muted">
            No explicit deterministic
            relationship required.
          </p>
        ) : (
          <ul>
            {u.relationships.map(
              (relationship) => (
                <li
                  key={
                    relationship.id
                  }
                >
                  <strong>
                    {
                      relationship.type
                    }
                  </strong>
                  {relationship.expression
                    ? ` · ${relationship.expression}`
                    : ""}
                </li>
              ),
            )}
          </ul>
        )}
      </section>

      <section>
        <h5>
          Visual classification
        </h5>
        <dl>
          <div>
            <dt>Has visual</dt>
            <dd>
              {u.visualContext
                .hasVisual
                ? "Yes"
                : "No"}
            </dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>
              {u.visualContext.role}
            </dd>
          </div>
          <div>
            <dt>Dependency</dt>
            <dd>
              {
                u.visualContext
                  .mathematicalDependency
              }
            </dd>
          </div>
          <div>
            <dt>
              Potentially manipulable
            </dt>
            <dd>
              {String(
                u.visualContext
                  .potentiallyManipulable,
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h5>Answer validation</h5>
        <p>
          <strong>
            {
              u.answerValidation
                .status
            }
          </strong>
          {u.answerValidation.reason
            ? ` — ${u.answerValidation.reason}`
            : ""}
        </p>
      </section>

      <section>
        <h5>
          Taxonomy evidence
        </h5>

        {u.evidence.filter(
          (evidence) =>
            evidence.relationship,
        ).length === 0 ? (
          <p className="phase4a2b-muted">
            No cross-taxonomy comparison
            recorded.
          </p>
        ) : (
          <ul className="phase4a2b-evidence">
            {u.evidence
              .filter(
                (evidence) =>
                  evidence.relationship,
              )
              .map(
                (
                  evidence,
                  index,
                ) => (
                  <li
                    key={`${evidence.code}-${index}`}
                  >
                    <strong>
                      {
                        evidence.relationship
                      }
                    </strong>
                    <span>
                      {evidence.message}
                    </span>
                  </li>
                ),
              )}
          </ul>
        )}
      </section>

      <section>
        <h5>Phase 4C gate diagnostics</h5>

        {u.gateDiagnostics.blockers.length === 0 ? (
          <p className="phase4a2b-muted">
            No Phase 4C blockers.
          </p>
        ) : (
          <ul className="phase4a2b-issues">
            {u.gateDiagnostics.blockers.map((diagnostic, index) => (
              <li key={`${diagnostic.code}-${index}`} data-severity="blocking">
                <strong>{diagnostic.code}</strong>
                <span>{diagnostic.message}</span>
              </li>
            ))}
          </ul>
        )}

        {u.gateDiagnostics.warnings.length > 0 && (
          <ul className="phase4a2b-issues">
            {u.gateDiagnostics.warnings.map((diagnostic, index) => (
              <li key={`${diagnostic.code}-${index}`} data-severity="info">
                <strong>{diagnostic.code}</strong>
                <span>{diagnostic.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h5>Blocking / QA issues</h5>

        {u.issues.length === 0 ? (
          <p className="phase4a2b-muted">
            No 4A-2C-5 gate issues.
          </p>
        ) : (
          <ul className="phase4a2b-issues">
            {u.issues.map(
              (issue, index) => (
                <li
                  key={`${issue.code}-${index}`}
                  data-severity={
                    issue.severity
                  }
                >
                  <strong>
                    {issue.code}
                  </strong>
                  <span>
                    {issue.message}
                  </span>
                </li>
              ),
            )}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function Phase4A2TeachingQA({
  qaExport,
}: Props) {
  const [run, setRun] =
    useState<Phase4A2QaRun | null>(
      null,
    );

  const [closureReport, setClosureReport] =
    useState<Phase4A2C5ClosureReport | null>(null);

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>("all");

  const [levelFilter, setLevelFilter] =
    useState("all");

  const [issueFilter, setIssueFilter] =
    useState("all");

  const [gateFilter, setGateFilter] =
    useState("all");

  const [curriculumFilter, setCurriculumFilter] =
    useState("all");

  const [answerFilter, setAnswerFilter] =
    useState("all");

  const [structureResolutionFilter, setStructureResolutionFilter] =
    useState("all");

  const [search, setSearch] =
    useState("");

  const [expandedId, setExpandedId] =
    useState<string | null>(null);

  const sampleSize =
    qaExport?.sample?.items
      ?.length ?? 0;

  const resultCount =
    qaExport?.results?.length ?? 0;

  const hasSample =
    sampleSize > 0;

  const issueOptions =
    useMemo(() => {
      if (!run) return [];

      return Object.keys(
        run.summary.issueCounts,
      ).sort();
    }, [run]);

  const gateOptions =
    useMemo(() => {
      if (!run) return [];
      return Object.keys(run.summary.gateDiagnosticCounts).sort();
    }, [run]);

  const curriculumOptions =
    useMemo(() => {
      if (!run) return [];
      return Object.keys(run.summary.byCurriculumSource).sort();
    }, [run]);

  const answerOptions =
    useMemo(() => {
      if (!run) return [];
      return Object.keys(run.summary.byAnswerValidation).sort();
    }, [run]);

  const structureResolutionOptions =
    useMemo(() => {
      if (!run) return [];
      return Object.keys(run.summary.byStructureResolution).sort();
    }, [run]);

  const levelOptions =
    useMemo(() => {
      if (!run) return [];

      return Object.keys(
        run.summary.byLevel,
      ).sort();
    }, [run]);

  const filteredItems =
    useMemo(() => {
      if (!run) return [];

      const query =
        search
          .trim()
          .toLowerCase();

      return run.items.filter(
        (item) => {
          if (
            statusFilter !==
              "all" &&
            item.understanding
              .status !==
              statusFilter
          ) {
            return false;
          }

          if (
            levelFilter !==
              "all" &&
            `P${
              item.primaryLevel ?? ""
            }` !== levelFilter
          ) {
            return false;
          }

          if (
            issueFilter !==
              "all" &&
            !item.understanding.issues.some(
              (issue) =>
                issue.code ===
                issueFilter,
            )
          ) {
            return false;
          }

          if (
            gateFilter !== "all" &&
            ![
              ...item.understanding.gateDiagnostics.blockers,
              ...item.understanding.gateDiagnostics.warnings,
            ].some((diagnostic) => diagnostic.code === gateFilter)
          ) {
            return false;
          }

          if (
            curriculumFilter !== "all" &&
            item.understanding.curriculumContext.selectedSource !== curriculumFilter
          ) {
            return false;
          }

          if (
            answerFilter !== "all" &&
            item.understanding.answerValidation.status !== answerFilter
          ) {
            return false;
          }

          if (
            structureResolutionFilter !== "all" &&
            item.understanding.resolution.structure !== structureResolutionFilter
          ) {
            return false;
          }

          if (query) {
            const searchable = [
              item.questionCode,
              item.questionId,
              item.topicTitle,
              item.understanding
                .source.canonical
                .curriculum
                .legacySkillLabel,
              item.understanding
                .source.canonical
                .content.prompt,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            if (
              !searchable.includes(
                query,
              )
            ) {
              return false;
            }
          }

          return true;
        },
      );
    }, [
      run,
      statusFilter,
      levelFilter,
      issueFilter,
      gateFilter,
      curriculumFilter,
      answerFilter,
      structureResolutionFilter,
      search,
    ]);

  const loadBaselineSnapshot = (): Phase4A2C5BaselineSnapshot | null => {
    try {
      const raw = window.localStorage.getItem(C5_BASELINE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Phase4A2C5BaselineSnapshot;
      return parsed?.schema_version === "4A-2C5-BASELINE.1" ? parsed : null;
    } catch {
      return null;
    }
  };

  const persistFixedBaseline = (nextRun: Phase4A2QaRun): Phase4A2C5BaselineSnapshot | null => {
    if (nextRun.sourceSeed !== PHASE4A2C5_FIXED_SEED) {
      return loadBaselineSnapshot();
    }

    const snapshot = toPhase4A2C5BaselineSnapshot(nextRun);

    if (snapshot.exact_fixed_regression_match && snapshot.safety_invariants_passed) {
      window.localStorage.setItem(
        C5_BASELINE_STORAGE_KEY,
        JSON.stringify(snapshot),
      );
      return snapshot;
    }

    window.localStorage.removeItem(C5_BASELINE_STORAGE_KEY);
    return snapshot;
  };

  const handleRun = () => {
    if (
      !qaExport ||
      !hasSample
    ) {
      return;
    }

    const next =
      runPhase4A2QaFromExport(
        qaExport,
      );

    setRun(next);
    setStatusFilter("all");
    setLevelFilter("all");
    setIssueFilter("all");
    setGateFilter("all");
    setCurriculumFilter("all");
    setAnswerFilter("all");
    setStructureResolutionFilter("all");
    setSearch("");
    setExpandedId(null);

    const baseline = persistFixedBaseline(next);
    setClosureReport(
      evaluatePhase4A2C5Closure(next, baseline),
    );
  };

  const handleExport = () => {
    if (!run || !closureReport) return;

    downloadJson(
      `phase-4a2c5-closure-${
        run.sourceRunId?.slice(
          0,
          8,
        ) ?? "qa"
      }.json`,
      {
        closure_report: closureReport,
        cohort_qa: toPhase4A2CompactExport(run),
      },
    );
  };

  return (
    <section className="phase4a2b-shell">
      <header className="phase4a2b-header">
        <div>
          <p className="phase4a2b-eyebrow">
            PHASE 4A-2C-5 ·
            FINAL REGRESSION & CLOSURE
          </p>

          <h3>
            Refined Teaching
            Understanding QA
          </h3>

          <p>
            Final fixed-cohort regression, excluded holdout verification, targeted semantic regression, and Phase 4C safety-invariant closure. C5 does not change question semantics or rewrite curriculum mappings.
          </p>
        </div>

        <div className="phase4a2b-runbox">
          <div>
            <strong>
              {sampleSize}
            </strong>
            <span>
              sample questions
            </span>
          </div>

          <div>
            <strong>
              {resultCount}
            </strong>
            <span>
              existing intelligence
              results
            </span>
          </div>

          <button
            type="button"
            onClick={handleRun}
            disabled={!hasSample}
          >
            Run 4A-2C-5 Closure Check
          </button>
        </div>
      </header>

      {!hasSample && (
        <div className="phase4a2b-empty">
          Generate or load a QA
          sample first.
        </div>
      )}

      {run && (
        <>
          {closureReport && (
            <div className="phase4a2c5-closure">
              <div className="phase4a2c5-closure-head">
                <div>
                  <strong>4A-2C-5 closure: {closureReport.closure.decision.replace(/_/g, " ")}</strong>
                  <span>
                    Cohort {closureReport.cohort.kind} · seed {closureReport.cohort.source_seed ?? "—"}
                  </span>
                </div>
                <button
                  type="button"
                  className="phase4a2b-secondary"
                  onClick={handleExport}
                >
                  Export 4A-2C-5 Closure JSON
                </button>
              </div>

              <div className="phase4a2c5-grid">
                <div>
                  <strong>{closureReport.safety.passed ? "PASS" : "FAIL"}</strong>
                  <span>Safety invariants</span>
                </div>
                <div>
                  <strong>{closureReport.targeted_regression.passed_count}/{closureReport.targeted_regression.total}</strong>
                  <span>Targeted regression</span>
                </div>
                <div>
                  <strong>{closureReport.fixed_cohort_regression.exact_match === null ? "—" : closureReport.fixed_cohort_regression.exact_match ? "PASS" : "FAIL"}</strong>
                  <span>Fixed 179 / 38 / 23</span>
                </div>
                <div>
                  <strong>{closureReport.holdout.exclusion_verified === null ? "—" : closureReport.holdout.exclusion_verified ? "PASS" : "FAIL"}</strong>
                  <span>Holdout exclusion</span>
                </div>
                <div>
                  <strong>{closureReport.cohort.balanced_40_per_level ? "PASS" : "FAIL"}</strong>
                  <span>40 questions per level</span>
                </div>
                <div>
                  <strong>{closureReport.probable_curriculum_mapping_issues.length}</strong>
                  <span>Mapping review candidates</span>
                </div>
              </div>

              <ul className="phase4a2c5-reasons">
                {closureReport.closure.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>

              <div className="phase4a2c5-targeted">
                {closureReport.targeted_regression.cases.map((item) => (
                  <span key={item.id} data-pass={item.passed ? "true" : "false"}>
                    {item.passed ? "✓" : "✕"} {item.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="phase4a2b-summary">
            <SummaryCard
              label="Processed"
              value={run.processed}
            />
            <SummaryCard
              label="Ready"
              value={
                run.summary.status
                  .ready
              }
              tone="good"
            />
            <SummaryCard
              label="Partial"
              value={
                run.summary.status
                  .partial
              }
              tone="warn"
            />
            <SummaryCard
              label="Needs review"
              value={
                run.summary.status
                  .needs_review
              }
              tone="bad"
            />
            <SummaryCard
              label="Strictly ready for 4C"
              value={
                run.summary
                  .strictlyReadyFor4C
              }
              tone="good"
            />
            <SummaryCard
              label="Blocked from 4C"
              value={
                run.summary
                  .blockedFrom4C
              }
              tone={
                run.summary
                  .blockedFrom4C > 0
                  ? "bad"
                  : "neutral"
              }
            />
            <SummaryCard
              label="Generic fallbacks"
              value={run.summary.genericFallbackQuestions}
              tone={run.summary.genericFallbackQuestions > 0 ? "warn" : "good"}
            />
            <SummaryCard
              label="Blocking conflicts"
              value={run.summary.blockingConflictQuestions}
              tone={run.summary.blockingConflictQuestions > 0 ? "bad" : "good"}
            />
            <SummaryCard
              label="Raw conflict evidence"
              value={run.summary.rawConflictEvidence}
              tone="neutral"
            />
            <SummaryCard
              label="Superseded evidence"
              value={run.summary.supersededEvidence}
              tone="neutral"
            />
            <SummaryCard
              label="Low-confidence questions"
              value={run.summary.lowConfidenceQuestions}
              tone={run.summary.lowConfidenceQuestions > 0 ? "warn" : "good"}
            />
            <SummaryCard
              label="Unresolved questions"
              value={run.summary.unresolvedQuestions}
              tone={run.summary.unresolvedQuestions > 0 ? "bad" : "good"}
            />
          </div>

          <div className="phase4a2b-breakdowns">
            <Breakdown
              title="By Primary level"
              values={
                run.summary.byLevel
              }
            />

            <Breakdown
              title="By domain"
              values={
                run.summary.byDomain
              }
            />

            <Breakdown
              title="By problem structure"
              values={
                run.summary
                  .byProblemStructure
              }
            />

            <Breakdown
              title="Visual classification"
              values={
                run.summary
                  .byVisualRole
              }
            />

            <Breakdown
              title="Curriculum evidence source"
              values={run.summary.byCurriculumSource}
              selected={curriculumFilter === "all" ? null : curriculumFilter}
              onSelect={(key) =>
                setCurriculumFilter(curriculumFilter === key ? "all" : key)
              }
            />

            <Breakdown
              title="Domain resolution"
              values={run.summary.byDomainResolution}
            />

            <Breakdown
              title="Structure resolution"
              values={run.summary.byStructureResolution}
              selected={structureResolutionFilter === "all" ? null : structureResolutionFilter}
              onSelect={(key) =>
                setStructureResolutionFilter(structureResolutionFilter === key ? "all" : key)
              }
            />

            <Breakdown
              title="Reasoning resolution"
              values={run.summary.byReasoningResolution}
            />

            <Breakdown
              title="Answer validation"
              values={run.summary.byAnswerValidation}
              selected={answerFilter === "all" ? null : answerFilter}
              onSelect={(key) =>
                setAnswerFilter(answerFilter === key ? "all" : key)
              }
            />

            <Breakdown
              title="Phase 4C gate diagnostics"
              values={run.summary.gateDiagnosticCounts}
              selected={gateFilter === "all" ? null : gateFilter}
              onSelect={(key) =>
                setGateFilter(gateFilter === key ? "all" : key)
              }
            />

            <Breakdown
              title="QA issues"
              values={
                run.summary
                  .issueCounts
              }
              selected={
                issueFilter === "all"
                  ? null
                  : issueFilter
              }
              onSelect={(key) =>
                setIssueFilter(
                  issueFilter === key
                    ? "all"
                    : key,
                )
              }
            />

            <Breakdown
              title="Taxonomy evidence"
              values={
                run.summary
                  .evidenceRelationshipCounts
              }
            />
          </div>

          <div className="phase4a2b-toolbar">
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as StatusFilter,
                )
              }
            >
              <option value="all">
                All statuses
              </option>
              <option value="ready">
                Ready
              </option>
              <option value="partial">
                Partial
              </option>
              <option value="needs_review">
                Needs review
              </option>
            </select>

            <select
              value={levelFilter}
              onChange={(event) =>
                setLevelFilter(
                  event.target.value,
                )
              }
            >
              <option value="all">
                All levels
              </option>

              {levelOptions.map(
                (level) => (
                  <option
                    value={level}
                    key={level}
                  >
                    {level}
                  </option>
                ),
              )}
            </select>

            <select
              value={issueFilter}
              onChange={(event) =>
                setIssueFilter(
                  event.target.value,
                )
              }
            >
              <option value="all">
                All issues
              </option>

              {issueOptions.map(
                (issue) => (
                  <option
                    value={issue}
                    key={issue}
                  >
                    {issue}
                  </option>
                ),
              )}
            </select>

            <select
              value={gateFilter}
              onChange={(event) => setGateFilter(event.target.value)}
            >
              <option value="all">All gate diagnostics</option>
              {gateOptions.map((code) => (
                <option value={code} key={code}>{code}</option>
              ))}
            </select>

            <select
              value={curriculumFilter}
              onChange={(event) => setCurriculumFilter(event.target.value)}
            >
              <option value="all">All curriculum sources</option>
              {curriculumOptions.map((source) => (
                <option value={source} key={source}>{source}</option>
              ))}
            </select>

            <select
              value={answerFilter}
              onChange={(event) => setAnswerFilter(event.target.value)}
            >
              <option value="all">All answer validation</option>
              {answerOptions.map((status) => (
                <option value={status} key={status}>{status}</option>
              ))}
            </select>

            <select
              value={structureResolutionFilter}
              onChange={(event) => setStructureResolutionFilter(event.target.value)}
            >
              <option value="all">All structure resolution</option>
              {structureResolutionOptions.map((status) => (
                <option value={status} key={status}>{status}</option>
              ))}
            </select>

            <input
              type="search"
              value={search}
              placeholder="Search code, prompt, topic or skill…"
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
            />

            <button
              type="button"
              className="phase4a2b-secondary"
              onClick={handleExport}
            >
              Export 4A-2C-5 Closure JSON
            </button>
          </div>

          <div className="phase4a2b-result-count">
            Showing{" "}
            {filteredItems.length} of{" "}
            {run.items.length}
          </div>

          <div className="phase4a2b-list">
            {filteredItems.map(
              (item) => {
                const id =
                  item.questionId ??
                  String(
                    item.index,
                  );

                const open =
                  expandedId === id;

                const prompt =
                  item.understanding
                    .source
                    .canonical
                    .content.prompt;

                return (
                  <article
                    className="phase4a2b-row"
                    key={id}
                  >
                    <button
                      type="button"
                      className="phase4a2b-row-button"
                      onClick={() =>
                        setExpandedId(
                          open
                            ? null
                            : id,
                        )
                      }
                    >
                      <div className="phase4a2b-row-index">
                        {String(
                          item.index,
                        ).padStart(
                          3,
                          "0",
                        )}
                      </div>

                      <div className="phase4a2b-row-main">
                        <div className="phase4a2b-row-meta">
                          <strong>
                            {item.questionCode ??
                              item.questionId ??
                              "Unknown question"}
                          </strong>

                          <span>
                            P
                            {item.primaryLevel ??
                              "?"}
                          </span>

                          <span>
                            {item.topicTitle ??
                              "Unknown topic"}
                          </span>
                        </div>

                        <p>
                          {prompt}
                        </p>

                        <div className="phase4a2b-row-signals">
                          <span>
                            Domain:{" "}
                            <strong>
                              {
                                item
                                  .understanding
                                  .domain
                              }
                            </strong>
                          </span>

                          <span>
                            Structure:{" "}
                            <strong>
                              {
                                item
                                  .understanding
                                  .problemStructure
                              }
                            </strong>
                          </span>

                          <span>
                            Resolution:{" "}
                            <strong>
                              {item.understanding.resolution.structure}
                            </strong>
                          </span>

                          <span>
                            Visual:{" "}
                            <strong>
                              {
                                item
                                  .understanding
                                  .visualContext
                                  .role
                              }
                            </strong>
                          </span>

                          <span>
                            4C:{" "}
                            <strong>
                              {item
                                .understanding
                                .readyForMethodSelection
                                ? "READY"
                                : "BLOCKED"}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="phase4a2b-row-status">
                        <StatusPill
                          status={
                            item
                              .understanding
                              .status
                          }
                        />

                        <span>
                          {Math.round(
                            item
                              .understanding
                              .confidence *
                              100,
                          )}
                          %
                        </span>
                      </div>
                    </button>

                    {open && (
                      <QuestionDetail
                        item={item}
                      />
                    )}
                  </article>
                );
              },
            )}
          </div>
        </>
      )}

      <style jsx>{`
        .phase4a2b-shell {
          margin-top: 24px;
          border: 1px solid #d7e0ec;
          border-radius: 18px;
          background: #ffffff;
          padding: 22px;
          color: #14263d;
        }

        .phase4a2b-header {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          align-items: flex-start;
        }

        .phase4a2b-header h3 {
          margin: 3px 0 7px;
          font-size: 24px;
        }

        .phase4a2b-header p {
          margin: 0;
          line-height: 1.5;
        }

        .phase4a2b-eyebrow {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #486482;
        }

        .phase4a2b-runbox {
          min-width: 310px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .phase4a2b-runbox > div {
          background: #f4f7fb;
          border-radius: 12px;
          padding: 10px 12px;
        }

        .phase4a2b-runbox strong,
        .phase4a2b-runbox span {
          display: block;
        }

        .phase4a2b-runbox strong {
          font-size: 20px;
        }

        .phase4a2b-runbox span {
          font-size: 12px;
          color: #61758d;
        }

        .phase4a2b-runbox button {
          grid-column: 1 / -1;
          border: 0;
          border-radius: 12px;
          padding: 12px 16px;
          background: #173b67;
          color: white;
          font-weight: 800;
          cursor: pointer;
        }

        .phase4a2b-runbox button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .phase4a2b-empty {
          margin-top: 16px;
          border-radius: 12px;
          background: #fff7dc;
          padding: 12px 14px;
        }

        .phase4a2b-summary {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 10px;
          margin-top: 20px;
        }

        .phase4a2b-summary-card {
          border-radius: 14px;
          padding: 15px;
          background: #f4f7fb;
          border: 1px solid #e2e8f0;
        }

        .phase4a2b-summary-card strong {
          display: block;
          font-size: 25px;
        }

        .phase4a2b-summary-card span {
          display: block;
          margin-top: 3px;
          font-size: 12px;
          color: #587089;
        }

        .phase4a2b-summary-card--good {
          background: #eefaf3;
        }

        .phase4a2b-summary-card--warn {
          background: #fff8e7;
        }

        .phase4a2b-summary-card--bad {
          background: #fff0f0;
        }

        .phase4a2b-breakdowns {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 14px;
          align-items: start;
        }

        .phase4a2b-breakdown {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 13px;
        }

        .phase4a2b-breakdown h4 {
          margin: 0 0 10px;
          font-size: 13px;
        }

        .phase4a2b-breakdown-list {
          display: grid;
          gap: 7px;
          max-height: 220px;
          overflow: auto;
        }

        .phase4a2b-breakdown-row {
          width: 100%;
          display: flex;
          gap: 8px;
          justify-content: space-between;
          font-size: 12px;
          border: 0;
          padding: 0;
          background: transparent;
          color: inherit;
          text-align: left;
        }

        .phase4a2b-breakdown-button {
          cursor: pointer;
          padding: 5px 6px;
          border-radius: 7px;
        }

        .phase4a2b-breakdown-button:hover,
        .phase4a2b-breakdown-row--selected {
          background: #eef3f8;
        }

        .phase4a2b-toolbar {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(150px, 1fr));
          gap: 8px;
          margin-top: 18px;
        }

        .phase4a2b-toolbar input {
          grid-column: span 3;
        }

        .phase4a2b-toolbar select,
        .phase4a2b-toolbar input,
        .phase4a2b-toolbar button {
          min-height: 40px;
          border-radius: 10px;
          border: 1px solid #d3deea;
          background: white;
          padding: 0 10px;
          color: #14263d;
        }

        .phase4a2b-toolbar button {
          cursor: pointer;
          font-weight: 700;
        }

        .phase4a2b-secondary {
          background: #f4f7fb !important;
        }

        .phase4a2b-result-count {
          margin: 12px 0 8px;
          font-size: 12px;
          color: #61758d;
        }

        .phase4a2b-list {
          display: grid;
          gap: 8px;
        }

        .phase4a2b-row {
          border: 1px solid #dfe7f0;
          border-radius: 14px;
          overflow: hidden;
        }

        .phase4a2b-row-button {
          width: 100%;
          border: 0;
          background: white;
          display: grid;
          grid-template-columns:
            50px minmax(0, 1fr) auto;
          gap: 12px;
          align-items: start;
          padding: 13px;
          cursor: pointer;
          color: inherit;
          text-align: left;
        }

        .phase4a2b-row-button:hover {
          background: #f8fafc;
        }

        .phase4a2b-row-index {
          font-weight: 800;
          color: #7b8da2;
          padding-top: 2px;
        }

        .phase4a2b-row-meta,
        .phase4a2b-row-signals {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 14px;
          align-items: center;
        }

        .phase4a2b-row-meta span,
        .phase4a2b-row-signals {
          font-size: 12px;
          color: #61758d;
        }

        .phase4a2b-row-main p {
          margin: 7px 0;
          line-height: 1.45;
        }

        .phase4a2b-row-status {
          min-width: 115px;
          text-align: right;
          display: grid;
          justify-items: end;
          gap: 6px;
        }

        .phase4a2b-row-status > span:last-child {
          font-size: 12px;
          color: #61758d;
        }

        .phase4a2b-status {
          display: inline-flex;
          border-radius: 999px;
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .phase4a2b-status--ready {
          background: #daf4e5;
          color: #155d38;
        }

        .phase4a2b-status--partial {
          background: #fff0bf;
          color: #7a5200;
        }

        .phase4a2b-status--needs_review {
          background: #ffdede;
          color: #8e2424;
        }

        .phase4a2b-detail {
          border-top: 1px solid #e5ebf2;
          background: #f8fafc;
          padding: 15px;
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .phase4a2b-detail section {
          background: white;
          border: 1px solid #e1e8f0;
          border-radius: 12px;
          padding: 12px;
        }

        .phase4a2b-detail h5 {
          margin: 0 0 9px;
          font-size: 13px;
        }

        .phase4a2b-detail dl {
          margin: 0;
          display: grid;
          gap: 6px;
        }

        .phase4a2b-detail dl > div {
          display: grid;
          grid-template-columns: 150px 1fr;
          gap: 8px;
          font-size: 12px;
        }

        .phase4a2b-detail dt {
          color: #61758d;
        }

        .phase4a2b-detail dd {
          margin: 0;
          font-weight: 650;
          overflow-wrap: anywhere;
        }

        .phase4a2b-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .phase4a2b-tags span {
          border-radius: 999px;
          background: #eef3f8;
          padding: 5px 8px;
          font-size: 11px;
        }

        .phase4a2b-muted {
          margin: 0;
          font-size: 12px;
          color: #7a8da4;
        }

        .phase4a2b-detail ul {
          margin: 0;
          padding-left: 18px;
        }

        .phase4a2b-issues,
        .phase4a2b-evidence {
          display: grid;
          gap: 7px;
          list-style: none;
          padding: 0 !important;
        }

        .phase4a2b-issues li,
        .phase4a2b-evidence li {
          border-radius: 9px;
          background: #fff7dc;
          padding: 8px 9px;
          display: grid;
          gap: 2px;
          font-size: 11px;
        }

        .phase4a2b-evidence li {
          background: #eef3f8;
        }

        .phase4a2b-issues li[data-severity="blocking"] {
          background: #ffe2e2;
        }

        .phase4a2b-issues li[data-severity="info"] {
          background: #eef3f8;
        }

        .phase4a2c5-closure {
          margin: 14px 0;
          border: 1px solid #d9e4ef;
          border-radius: 16px;
          padding: 16px;
          background: #ffffff;
          display: grid;
          gap: 14px;
        }

        .phase4a2c5-closure-head {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: center;
        }

        .phase4a2c5-closure-head > div {
          display: grid;
          gap: 4px;
        }

        .phase4a2c5-closure-head strong {
          text-transform: uppercase;
        }

        .phase4a2c5-closure-head span {
          color: #61758d;
          font-size: 12px;
        }

        .phase4a2c5-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 8px;
        }

        .phase4a2c5-grid > div {
          border: 1px solid #e2e9f1;
          border-radius: 12px;
          padding: 10px;
          display: grid;
          gap: 4px;
        }

        .phase4a2c5-grid strong {
          font-size: 17px;
        }

        .phase4a2c5-grid span {
          color: #61758d;
          font-size: 11px;
        }

        .phase4a2c5-reasons {
          margin: 0;
          padding-left: 18px;
          color: #40566f;
          font-size: 12px;
        }

        .phase4a2c5-targeted {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .phase4a2c5-targeted span {
          border-radius: 999px;
          padding: 5px 8px;
          font-size: 11px;
          background: #e8f6ee;
          color: #155d38;
        }

        .phase4a2c5-targeted span[data-pass="false"] {
          background: #ffe3e3;
          color: #8e2424;
        }

        @media (max-width: 1200px) {
          .phase4a2b-summary {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }

          .phase4a2b-breakdowns {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .phase4a2c5-grid {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 900px) {
          .phase4a2b-toolbar {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .phase4a2b-toolbar input {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 760px) {
          .phase4a2b-shell {
            padding: 14px;
          }

          .phase4a2b-header {
            display: grid;
          }

          .phase4a2b-runbox {
            min-width: 0;
            width: 100%;
          }

          .phase4a2b-summary,
          .phase4a2b-breakdowns,
          .phase4a2b-toolbar,
          .phase4a2b-detail {
            grid-template-columns: 1fr;
          }

          .phase4a2b-row-button {
            grid-template-columns:
              42px minmax(0, 1fr);
          }

          .phase4a2c5-closure-head {
            display: grid;
          }

          .phase4a2c5-grid {
            grid-template-columns: 1fr;
          }

          .phase4a2b-row-status {
            grid-column: 2;
            justify-items: start;
            text-align: left;
          }
        }
      `}</style>
    </section>
  );
}
