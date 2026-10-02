"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  runPhase4A2QaFromExport,
  toPhase4A2CompactExport,
} from "../../../lib/math-intelligence/teaching";

import type {
  MathIntelligenceQaExportLike,
  Phase4A2QaItem,
  Phase4A2QaRun,
} from "../../../lib/math-intelligence/teaching";

type Props = {
  qaExport: MathIntelligenceQaExportLike | null | undefined;
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
    {
      type: "application/json",
    },
  );

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

function statusLabel(
  status: Phase4A2QaItem["understanding"]["status"],
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
  status: Phase4A2QaItem["understanding"]["status"];
}) {
  return (
    <span
      className={`phase4a2-status phase4a2-status--${status}`}
    >
      {statusLabel(status)}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "good" | "warn" | "bad" | "neutral";
}) {
  return (
    <div
      className={`phase4a2-summary-card phase4a2-summary-card--${
        tone ?? "neutral"
      }`}
    >
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Breakdown({
  title,
  values,
}: {
  title: string;
  values: Record<string, number>;
}) {
  const entries = Object.entries(values).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div className="phase4a2-breakdown">
      <h4>{title}</h4>

      {entries.length === 0 ? (
        <p className="phase4a2-muted">No data.</p>
      ) : (
        <div className="phase4a2-breakdown-list">
          {entries.map(([key, value]) => (
            <div
              className="phase4a2-breakdown-row"
              key={key}
            >
              <span>{key}</span>
              <strong>{value}</strong>
            </div>
          ))}
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
  const u = item.understanding;

  return (
    <div className="phase4a2-detail">
      <section>
        <h5>Existing Math Intelligence</h5>
        <dl>
          <div>
            <dt>Domain</dt>
            <dd>
              {item.existingProposal.domain ?? "—"}
            </dd>
          </div>
          <div>
            <dt>Problem structure</dt>
            <dd>
              {item.existingProposal.problemStructure ??
                "—"}
            </dd>
          </div>
          <div>
            <dt>Target</dt>
            <dd>
              {item.existingProposal.targetLabel ?? "—"}
            </dd>
          </div>
          <div>
            <dt>Confidence</dt>
            <dd>
              {item.existingProposal.confidence ??
                "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h5>4A-2 Understanding</h5>
        <dl>
          <div>
            <dt>Domain</dt>
            <dd>{u.domain}</dd>
          </div>
          <div>
            <dt>Problem structure</dt>
            <dd>{u.problemStructure}</dd>
          </div>
          <div>
            <dt>Target</dt>
            <dd>
              {u.target?.label ??
                u.target?.kind ??
                "—"}
            </dd>
          </div>
          <div>
            <dt>Confidence</dt>
            <dd>
              {Math.round(u.confidence * 100)}%
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h5>Required operations</h5>
        <div className="phase4a2-tags">
          {u.requiredOperations.map((operation) => (
            <span key={operation}>
              {operation}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h5>Quantities</h5>

        {u.quantities.length === 0 ? (
          <p className="phase4a2-muted">
            No deterministic quantities extracted.
          </p>
        ) : (
          <div className="phase4a2-tags">
            {u.quantities.map((quantity) => (
              <span key={quantity.id}>
                {quantity.raw}
                {quantity.unit
                  ? ` ${quantity.unit}`
                  : ""}
              </span>
            ))}
          </div>
        )}
      </section>

      <section>
        <h5>Relationships</h5>

        {u.relationships.length === 0 ? (
          <p className="phase4a2-muted">
            No deterministic relationships extracted.
          </p>
        ) : (
          <ul>
            {u.relationships.map((relationship) => (
              <li key={relationship.id}>
                <strong>{relationship.type}</strong>
                {relationship.expression
                  ? ` · ${relationship.expression}`
                  : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h5>Visual classification</h5>
        <dl>
          <div>
            <dt>Has visual</dt>
            <dd>
              {u.visualContext.hasVisual
                ? "Yes"
                : "No"}
            </dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{u.visualContext.role}</dd>
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
            <dt>Potentially manipulable</dt>
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
            {u.answerValidation.status}
          </strong>
          {u.answerValidation.reason
            ? ` — ${u.answerValidation.reason}`
            : ""}
        </p>
      </section>

      <section>
        <h5>Issues</h5>

        {u.issues.length === 0 ? (
          <p className="phase4a2-muted">
            No 4A-2 issues.
          </p>
        ) : (
          <ul className="phase4a2-issues">
            {u.issues.map((issue, index) => (
              <li
                key={`${issue.code}-${index}`}
                data-severity={issue.severity}
              >
                <strong>{issue.code}</strong>
                <span>{issue.message}</span>
              </li>
            ))}
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
    useState<Phase4A2QaRun | null>(null);

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [levelFilter, setLevelFilter] =
    useState<string>("all");

  const [issueFilter, setIssueFilter] =
    useState<string>("all");

  const [search, setSearch] =
    useState("");

  const [expandedId, setExpandedId] =
    useState<string | null>(null);

  const sampleSize =
    qaExport?.sample?.items?.length ?? 0;

  const hasSample = sampleSize > 0;

  const resultCount =
    qaExport?.results?.length ?? 0;

  const issueOptions = useMemo(() => {
    if (!run) return [];

    return Object.keys(
      run.summary.issueCounts,
    ).sort();
  }, [run]);

  const levelOptions = useMemo(() => {
    if (!run) return [];

    return Object.keys(
      run.summary.byLevel,
    ).sort();
  }, [run]);

  const filteredItems = useMemo(() => {
    if (!run) return [];

    const query =
      search.trim().toLowerCase();

    return run.items.filter((item) => {
      if (
        statusFilter !== "all" &&
        item.understanding.status !== statusFilter
      ) {
        return false;
      }

      if (
        levelFilter !== "all" &&
        `P${item.primaryLevel ?? ""}` !==
          levelFilter
      ) {
        return false;
      }

      if (
        issueFilter !== "all" &&
        !item.understanding.issues.some(
          (issue) =>
            issue.code === issueFilter,
        )
      ) {
        return false;
      }

      if (query) {
        const searchable = [
          item.questionCode,
          item.questionId,
          item.topicTitle,
          item.understanding.source.canonical
            .content.prompt,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [
    run,
    statusFilter,
    levelFilter,
    issueFilter,
    search,
  ]);

  const handleRun = () => {
    if (!qaExport || !hasSample) return;

    const next =
      runPhase4A2QaFromExport(qaExport);

    setRun(next);
    setStatusFilter("all");
    setLevelFilter("all");
    setIssueFilter("all");
    setSearch("");
    setExpandedId(null);
  };

  const handleExport = () => {
    if (!run) return;

    downloadJson(
      `phase-4a2-teaching-understanding-${
        run.sourceRunId?.slice(0, 8) ??
        "qa"
      }.json`,
      toPhase4A2CompactExport(run),
    );
  };

  return (
    <section className="phase4a2-shell">
      <header className="phase4a2-header">
        <div>
          <p className="phase4a2-eyebrow">
            PHASE 4A · TEACHING QUESTION
            UNDERSTANDING
          </p>

          <h3>
            4A-2 Teaching Understanding QA
          </h3>

          <p>
            Runs the deterministic teaching
            understanding layer against the
            existing QA sample. No Luna call and
            no database write.
          </p>
        </div>

        <div className="phase4a2-runbox">
          <div>
            <strong>{sampleSize}</strong>
            <span>sample questions</span>
          </div>

          <div>
            <strong>{resultCount}</strong>
            <span>
              existing intelligence results
            </span>
          </div>

          <button
            type="button"
            onClick={handleRun}
            disabled={!hasSample}
          >
            Run 4A-2 Teaching Understanding
          </button>
        </div>
      </header>

      {!hasSample && (
        <div className="phase4a2-empty">
          Generate or load a QA sample first.
        </div>
      )}

      {run && (
        <>
          <div className="phase4a2-summary">
            <SummaryCard
              label="Processed"
              value={run.processed}
            />

            <SummaryCard
              label="Ready"
              value={run.summary.status.ready}
              tone="good"
            />

            <SummaryCard
              label="Partial"
              value={run.summary.status.partial}
              tone="warn"
            />

            <SummaryCard
              label="Needs review"
              value={
                run.summary.status.needs_review
              }
              tone="bad"
            />

            <SummaryCard
              label="Ready for method selection"
              value={
                run.summary
                  .readyForMethodSelection
              }
              tone="good"
            />
          </div>

          <div className="phase4a2-breakdowns">
            <Breakdown
              title="By Primary level"
              values={run.summary.byLevel}
            />

            <Breakdown
              title="By domain"
              values={run.summary.byDomain}
            />

            <Breakdown
              title="By problem structure"
              values={
                run.summary.byProblemStructure
              }
            />

            <Breakdown
              title="Visual classification"
              values={
                run.summary.byVisualRole
              }
            />

            <Breakdown
              title="Understanding issues"
              values={
                run.summary.issueCounts
              }
            />
          </div>

          <div className="phase4a2-toolbar">
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

              {levelOptions.map((level) => (
                <option
                  value={level}
                  key={level}
                >
                  {level}
                </option>
              ))}
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

              {issueOptions.map((issue) => (
                <option
                  value={issue}
                  key={issue}
                >
                  {issue}
                </option>
              ))}
            </select>

            <input
              type="search"
              value={search}
              placeholder="Search code, prompt, topic…"
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

            <button
              type="button"
              className="phase4a2-secondary"
              onClick={handleExport}
            >
              Export 4A-2 JSON
            </button>
          </div>

          <div className="phase4a2-result-count">
            Showing {filteredItems.length} of{" "}
            {run.items.length}
          </div>

          <div className="phase4a2-list">
            {filteredItems.map((item) => {
              const id =
                item.questionId ??
                String(item.index);

              const open =
                expandedId === id;

              const prompt =
                item.understanding.source
                  .canonical.content.prompt;

              return (
                <article
                  className="phase4a2-row"
                  key={id}
                >
                  <button
                    type="button"
                    className="phase4a2-row-button"
                    onClick={() =>
                      setExpandedId(
                        open ? null : id,
                      )
                    }
                  >
                    <div className="phase4a2-row-index">
                      {String(
                        item.index,
                      ).padStart(3, "0")}
                    </div>

                    <div className="phase4a2-row-main">
                      <div className="phase4a2-row-meta">
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

                      <p>{prompt}</p>

                      <div className="phase4a2-row-signals">
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
                      </div>
                    </div>

                    <div className="phase4a2-row-status">
                      <StatusPill
                        status={
                          item.understanding
                            .status
                        }
                      />

                      <span>
                        {Math.round(
                          item.understanding
                            .confidence * 100,
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
            })}
          </div>
        </>
      )}

      <style jsx>{`
        .phase4a2-shell {
          margin-top: 24px;
          border: 1px solid #d7e0ec;
          border-radius: 18px;
          background: #ffffff;
          padding: 22px;
          color: #14263d;
        }

        .phase4a2-header {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          align-items: flex-start;
        }

        .phase4a2-header h3 {
          margin: 3px 0 7px;
          font-size: 24px;
        }

        .phase4a2-header p {
          margin: 0;
          line-height: 1.5;
        }

        .phase4a2-eyebrow {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #486482;
        }

        .phase4a2-runbox {
          min-width: 310px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .phase4a2-runbox > div {
          background: #f4f7fb;
          border-radius: 12px;
          padding: 10px 12px;
        }

        .phase4a2-runbox strong,
        .phase4a2-runbox span {
          display: block;
        }

        .phase4a2-runbox strong {
          font-size: 20px;
        }

        .phase4a2-runbox span {
          font-size: 12px;
          color: #61758d;
        }

        .phase4a2-runbox button {
          grid-column: 1 / -1;
          border: 0;
          border-radius: 12px;
          padding: 12px 16px;
          background: #173b67;
          color: white;
          font-weight: 800;
          cursor: pointer;
        }

        .phase4a2-runbox button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .phase4a2-empty {
          margin-top: 16px;
          border-radius: 12px;
          background: #fff7dc;
          padding: 12px 14px;
        }

        .phase4a2-summary {
          display: grid;
          grid-template-columns: repeat(
            5,
            minmax(0, 1fr)
          );
          gap: 10px;
          margin-top: 20px;
        }

        .phase4a2-summary-card {
          border-radius: 14px;
          padding: 15px;
          background: #f4f7fb;
          border: 1px solid #e2e8f0;
        }

        .phase4a2-summary-card strong {
          display: block;
          font-size: 25px;
        }

        .phase4a2-summary-card span {
          display: block;
          margin-top: 3px;
          font-size: 12px;
          color: #587089;
        }

        .phase4a2-summary-card--good {
          background: #eefaf3;
        }

        .phase4a2-summary-card--warn {
          background: #fff8e7;
        }

        .phase4a2-summary-card--bad {
          background: #fff0f0;
        }

        .phase4a2-breakdowns {
          display: grid;
          grid-template-columns: repeat(
            5,
            minmax(0, 1fr)
          );
          gap: 12px;
          margin-top: 14px;
          align-items: start;
        }

        .phase4a2-breakdown {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 13px;
        }

        .phase4a2-breakdown h4 {
          margin: 0 0 10px;
          font-size: 13px;
        }

        .phase4a2-breakdown-list {
          display: grid;
          gap: 7px;
          max-height: 220px;
          overflow: auto;
        }

        .phase4a2-breakdown-row {
          display: flex;
          gap: 8px;
          justify-content: space-between;
          font-size: 12px;
        }

        .phase4a2-breakdown-row span {
          overflow-wrap: anywhere;
        }

        .phase4a2-toolbar {
          display: grid;
          grid-template-columns:
            150px 120px 220px minmax(180px, 1fr)
            auto;
          gap: 8px;
          margin-top: 18px;
        }

        .phase4a2-toolbar select,
        .phase4a2-toolbar input,
        .phase4a2-toolbar button {
          min-height: 40px;
          border-radius: 10px;
          border: 1px solid #d3deea;
          background: white;
          padding: 0 10px;
          color: #14263d;
        }

        .phase4a2-toolbar button {
          cursor: pointer;
          font-weight: 700;
        }

        .phase4a2-secondary {
          background: #f4f7fb !important;
        }

        .phase4a2-result-count {
          margin: 12px 0 8px;
          font-size: 12px;
          color: #61758d;
        }

        .phase4a2-list {
          display: grid;
          gap: 8px;
        }

        .phase4a2-row {
          border: 1px solid #dfe7f0;
          border-radius: 14px;
          overflow: hidden;
        }

        .phase4a2-row-button {
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

        .phase4a2-row-button:hover {
          background: #f8fafc;
        }

        .phase4a2-row-index {
          font-weight: 800;
          color: #7b8da2;
          padding-top: 2px;
        }

        .phase4a2-row-meta,
        .phase4a2-row-signals {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 14px;
          align-items: center;
        }

        .phase4a2-row-meta span,
        .phase4a2-row-signals {
          font-size: 12px;
          color: #61758d;
        }

        .phase4a2-row-main p {
          margin: 7px 0;
          line-height: 1.45;
        }

        .phase4a2-row-status {
          min-width: 115px;
          text-align: right;
          display: grid;
          justify-items: end;
          gap: 6px;
        }

        .phase4a2-row-status > span:last-child {
          font-size: 12px;
          color: #61758d;
        }

        .phase4a2-status {
          display: inline-flex;
          border-radius: 999px;
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .phase4a2-status--ready {
          background: #daf4e5;
          color: #155d38;
        }

        .phase4a2-status--partial {
          background: #fff0bf;
          color: #7a5200;
        }

        .phase4a2-status--needs_review {
          background: #ffdede;
          color: #8e2424;
        }

        .phase4a2-detail {
          border-top: 1px solid #e5ebf2;
          background: #f8fafc;
          padding: 15px;
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .phase4a2-detail section {
          background: white;
          border: 1px solid #e1e8f0;
          border-radius: 12px;
          padding: 12px;
        }

        .phase4a2-detail h5 {
          margin: 0 0 9px;
          font-size: 13px;
        }

        .phase4a2-detail dl {
          margin: 0;
          display: grid;
          gap: 6px;
        }

        .phase4a2-detail dl > div {
          display: grid;
          grid-template-columns: 140px 1fr;
          gap: 8px;
          font-size: 12px;
        }

        .phase4a2-detail dt {
          color: #61758d;
        }

        .phase4a2-detail dd {
          margin: 0;
          font-weight: 650;
          overflow-wrap: anywhere;
        }

        .phase4a2-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .phase4a2-tags span {
          border-radius: 999px;
          background: #eef3f8;
          padding: 5px 8px;
          font-size: 11px;
        }

        .phase4a2-muted {
          margin: 0;
          font-size: 12px;
          color: #7a8da4;
        }

        .phase4a2-detail ul {
          margin: 0;
          padding-left: 18px;
        }

        .phase4a2-issues {
          display: grid;
          gap: 7px;
          list-style: none;
          padding: 0 !important;
        }

        .phase4a2-issues li {
          border-radius: 9px;
          background: #fff7dc;
          padding: 8px 9px;
          display: grid;
          gap: 2px;
          font-size: 11px;
        }

        .phase4a2-issues li[data-severity="blocking"] {
          background: #ffe2e2;
        }

        .phase4a2-issues li[data-severity="info"] {
          background: #eef3f8;
        }

        @media (max-width: 1100px) {
          .phase4a2-summary {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }

          .phase4a2-breakdowns {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .phase4a2-toolbar {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .phase4a2-toolbar input {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 760px) {
          .phase4a2-shell {
            padding: 14px;
          }

          .phase4a2-header {
            display: grid;
          }

          .phase4a2-runbox {
            min-width: 0;
            width: 100%;
          }

          .phase4a2-summary,
          .phase4a2-breakdowns,
          .phase4a2-toolbar,
          .phase4a2-detail {
            grid-template-columns: 1fr;
          }

          .phase4a2-row-button {
            grid-template-columns:
              42px minmax(0, 1fr);
          }

          .phase4a2-row-status {
            grid-column: 2;
            justify-items: start;
            text-align: left;
          }
        }
      `}</style>
    </section>
  );
}
