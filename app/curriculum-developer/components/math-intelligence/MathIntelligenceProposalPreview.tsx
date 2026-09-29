"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  MathVisualRenderer,
  buildMathVisualStateForStep,
  getMathVisualIdsForTeachingStep,
  readMathVisualTeachingSteps,
  type MathVisualSpec,
  type MathVisualTeachingStep,
} from "@/components/core-math/visual-engine";
import type { MathAuthoringProposal } from "@/lib/math-intelligence/MathAuthoringProposalTypes";

type TeachingDraft = Record<string, unknown>;
type PreviewMode = "diagram" | "lesson" | "teach_me";

export default function MathIntelligenceProposalPreview({
  proposal,
  currentVisual = null,
  currentTeaching = {},
  comparison = false,
}: {
  proposal: MathAuthoringProposal;
  currentVisual?: MathVisualSpec | null;
  currentTeaching?: TeachingDraft;
  comparison?: boolean;
}) {
  const [mode, setMode] = useState<PreviewMode>("diagram");
  const [stepIndex, setStepIndex] = useState(0);

  const proposalSteps =
    mode === "lesson"
      ? proposal.teaching?.lesson_steps ?? []
      : mode === "teach_me"
        ? proposal.teaching?.teach_me_steps ?? []
        : [];

  const currentSteps = useMemo(
    () =>
      mode === "diagram"
        ? []
        : readCurrentSteps(currentTeaching, mode === "lesson" ? "lesson" : "teach_me"),
    [currentTeaching, mode],
  );

  const maxStepCount = Math.max(proposalSteps.length, comparison ? currentSteps.length : 0);
  const boundedGlobalStep = Math.max(0, Math.min(stepIndex, Math.max(0, maxStepCount - 1)));

  const structuralValid = Boolean(proposal.visual.structural_validation?.valid);
  const semanticValid = Boolean(
    proposal.visual.semantic_validation?.valid &&
      !proposal.visual.semantic_validation?.review_required,
  );
  const teachingValid =
    !proposal.teaching ||
    proposal.teaching.status === "not_needed" ||
    Boolean(
      proposal.teaching.validation?.valid &&
        !proposal.teaching.validation?.review_required,
    );

  return (
    <div style={shell}>
      <div style={topRow}>
        <div>
          <span style={eyebrow}>MATH INTELLIGENCE PROPOSAL</span>
          <strong style={title}>{proposalTitle(proposal)}</strong>
          <p style={subtext}>
            Preview only. Nothing from this proposal has been applied to the question.
          </p>
        </div>
        <span style={proposalStatusStyle(proposal.status)}>
          {statusLabel(proposal.status)}
        </span>
      </div>

      <div style={decisionGrid}>
        <DecisionItem label="Visual need" value={humanise(proposal.decision.visual_need)} />
        <DecisionItem label="Strategy" value={humanise(proposal.decision.strategy)} />
        <DecisionItem
          label="Interpretation"
          value={sourceLabel(
            proposal.sources.interpretation.source,
            proposal.sources.interpretation.model,
          )}
        />
        <DecisionItem label="Teaching" value={teachingSourceLabel(proposal)} />
        <DecisionItem label="Domain" value={humanise(proposal.decision.domain)} />
        <DecisionItem
          label="Confidence"
          value={`${Math.round(proposal.decision.confidence * 100)}%`}
        />
      </div>

      <div style={validationRow}>
        <ValidationPill label="V2 structure" valid={structuralValid} />
        <ValidationPill label="Mathematics" valid={semanticValid} />
        <ValidationPill label="Teaching" valid={teachingValid} />
      </div>

      <div style={previewTabs}>
        {(["diagram", "lesson", "teach_me"] as const).map((nextMode) => {
          const proposalCount =
            nextMode === "lesson"
              ? proposal.teaching?.lesson_steps.length || 0
              : nextMode === "teach_me"
                ? proposal.teaching?.teach_me_steps.length || 0
                : null;
          return (
            <button
              key={nextMode}
              type="button"
              onClick={() => {
                setMode(nextMode);
                setStepIndex(0);
              }}
              style={tab(mode === nextMode)}
            >
              {nextMode === "diagram"
                ? "Diagram"
                : nextMode === "lesson"
                  ? `Lesson${proposalCount ? ` (${proposalCount})` : ""}`
                  : `Teach Me${proposalCount ? ` (${proposalCount})` : ""}`}
            </button>
          );
        })}
      </div>

      {comparison ? (
        <div style={comparisonGrid}>
          <PreviewPane
            label="CURRENT"
            spec={currentVisual}
            steps={currentSteps}
            mode={mode}
            stepIndex={boundedGlobalStep}
            emptyText={
              currentVisual
                ? "No current visual teaching steps in this section."
                : "No current Math Visual V2 content."
            }
          />
          <PreviewPane
            label="PROPOSAL"
            spec={proposal.visual.spec}
            steps={proposalSteps}
            mode={mode}
            stepIndex={boundedGlobalStep}
            emptyText={proposalEmptyText(proposal, mode)}
          />
        </div>
      ) : (
        <PreviewPane
          label="PROPOSAL"
          spec={proposal.visual.spec}
          steps={proposalSteps}
          mode={mode}
          stepIndex={boundedGlobalStep}
          emptyText={proposalEmptyText(proposal, mode)}
          standalone
        />
      )}

      {mode !== "diagram" && maxStepCount > 0 ? (
        <div style={stepControls}>
          <button
            type="button"
            disabled={boundedGlobalStep <= 0}
            onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
            style={stepButton}
          >
            ← Previous
          </button>
          <span style={stepCounter}>
            Step {boundedGlobalStep + 1} of {maxStepCount}
          </span>
          <button
            type="button"
            disabled={boundedGlobalStep >= maxStepCount - 1}
            onClick={() =>
              setStepIndex((value) => Math.min(maxStepCount - 1, value + 1))
            }
            style={stepButton}
          >
            Next →
          </button>
        </div>
      ) : null}

      {proposal.issues.length > 0 ? (
        <details style={issuesBox}>
          <summary style={issuesSummary}>
            Review notes ({proposal.issues.length})
          </summary>
          <ul style={issueList}>
            {proposal.issues.slice(0, 12).map((issue, index) => (
              <li key={`${issue.source}-${issue.code}-${index}`}>
                <strong>{issue.severity.toUpperCase()}</strong> · {issue.message}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function PreviewPane({
  label,
  spec,
  steps,
  mode,
  stepIndex,
  emptyText,
  standalone = false,
}: {
  label: string;
  spec: MathVisualSpec | null;
  steps: MathVisualTeachingStep[];
  mode: PreviewMode;
  stepIndex: number;
  emptyText: string;
  standalone?: boolean;
}) {
  const boundedStep = Math.max(0, Math.min(stepIndex, Math.max(0, steps.length - 1)));
  const runtimeState =
    mode !== "diagram" && steps.length > 0
      ? buildMathVisualStateForStep(steps, boundedStep, { cumulative: true })
      : undefined;
  const visualIds =
    mode !== "diagram" && steps.length > 0
      ? getMathVisualIdsForTeachingStep(steps, boundedStep)
      : [];
  const visualId = visualIds[0];
  const step = steps[boundedStep];

  return (
    <div style={standalone ? standalonePane : previewPane}>
      <div style={paneHeader}>
        <span style={paneLabel}>{label}</span>
        {mode !== "diagram" && steps.length > 0 ? (
          <span style={paneStepCount}>
            {boundedStep + 1}/{steps.length}
          </span>
        ) : null}
      </div>

      {mode !== "diagram" && step ? (
        <div style={stepHeader}>
          <strong>{step.text || "Visual teaching step"}</strong>
        </div>
      ) : null}

      {!spec ? (
        <div style={emptyState}>{emptyText}</div>
      ) : mode !== "diagram" && steps.length === 0 ? (
        <div style={emptyState}>{emptyText}</div>
      ) : (
        <MathVisualRenderer
          spec={spec}
          visualId={visualId}
          placement={visualId ? undefined : "prompt"}
          runtimeState={runtimeState}
          size="large"
          showTitle
        />
      )}
    </div>
  );
}

function readCurrentSteps(
  teaching: TeachingDraft,
  key: "lesson" | "teach_me",
): MathVisualTeachingStep[] {
  const slot = teaching?.[key];
  if (!slot || typeof slot !== "object" || Array.isArray(slot)) return [];
  const raw = (slot as Record<string, unknown>).visual_steps;
  const result = readMathVisualTeachingSteps(raw);
  return result.steps;
}

function DecisionItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={decisionItem}>
      <span style={decisionLabel}>{label}</span>
      <strong style={decisionValue}>{value}</strong>
    </div>
  );
}

function ValidationPill({ label, valid }: { label: string; valid: boolean }) {
  return (
    <span style={validationPill(valid)}>
      {valid ? "✓" : "⚠"} {label}
    </span>
  );
}

function proposalEmptyText(proposal: MathAuthoringProposal, mode: PreviewMode) {
  if (mode === "lesson" || mode === "teach_me") {
    if (proposal.teaching?.status === "not_needed") {
      return "Dreamscape determined that visual teaching is not required for this question.";
    }
    return `No ${mode === "lesson" ? "Lesson" : "Teach Me"} visual steps were proposed.`;
  }

  if (proposal.status === "not_needed") {
    return "No mathematical visual recommended. Dreamscape determined that this question is clearer without a generated diagram.";
  }
  if (proposal.status === "preserved") {
    return "Existing learner-facing media should be preserved rather than replaced by a generated V2 visual.";
  }
  if (proposal.status === "needs_review") {
    return "The current V2 generator could not produce a sufficiently safe automatic diagram for this question.";
  }
  if (proposal.status === "invalid") {
    return "The generated proposal failed validation and cannot be accepted.";
  }
  return "No generated V2 diagram is available.";
}

function teachingSourceLabel(proposal: MathAuthoringProposal) {
  const source = proposal.sources.teaching.source;
  if (source === "none") return "Not required";
  return sourceLabel(source, proposal.sources.teaching.model);
}

function sourceLabel(source: "rules" | "luna", model: string | null) {
  if (source === "rules") return "Dreamscape Rules";
  return model ? `Dreamscape → Luna (${model})` : "Dreamscape → Luna";
}

function proposalTitle(proposal: MathAuthoringProposal) {
  if (proposal.status === "generated") return "Generated visual + teaching proposal";
  if (proposal.status === "not_needed") return "No visual recommended";
  if (proposal.status === "preserved") return "Preserve existing media";
  if (proposal.status === "needs_review") return "Manual review required";
  return "Proposal failed validation";
}

function statusLabel(status: MathAuthoringProposal["status"]) {
  if (status === "generated") return "Generated";
  if (status === "not_needed") return "Not needed";
  if (status === "preserved") return "Preserved";
  if (status === "needs_review") return "Needs review";
  return "Invalid";
}

function humanise(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

const shell: CSSProperties = {
  borderRadius: 15,
  border: "1px solid rgba(126,232,255,0.2)",
  background: "rgba(5,22,45,0.78)",
  padding: 14,
  display: "grid",
  gap: 12,
};
const topRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};
const eyebrow: CSSProperties = {
  display: "block",
  color: "#8ee8ff",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: "0.14em",
  marginBottom: 5,
};
const title: CSSProperties = { display: "block", color: "white", fontSize: 15 };
const subtext: CSSProperties = {
  margin: "5px 0 0",
  color: "rgba(255,255,255,0.56)",
  fontSize: 11,
  lineHeight: 1.45,
};
const decisionGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
  gap: 8,
};
const decisionItem: CSSProperties = {
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.035)",
  padding: "9px 10px",
  display: "grid",
  gap: 3,
};
const decisionLabel: CSSProperties = {
  color: "rgba(255,255,255,0.46)",
  fontSize: 9,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};
const decisionValue: CSSProperties = {
  color: "rgba(255,255,255,0.9)",
  fontSize: 11,
  lineHeight: 1.35,
};
const validationRow: CSSProperties = { display: "flex", gap: 7, flexWrap: "wrap" };
function validationPill(valid: boolean): CSSProperties {
  return {
    borderRadius: 999,
    padding: "6px 9px",
    border: valid
      ? "1px solid rgba(74,222,128,0.24)"
      : "1px solid rgba(251,191,36,0.26)",
    background: valid ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
    color: valid ? "#bbf7d0" : "#fde68a",
    fontSize: 10,
    fontWeight: 850,
  };
}
const previewTabs: CSSProperties = { display: "flex", gap: 6, flexWrap: "wrap" };
function tab(active: boolean): CSSProperties {
  return {
    borderRadius: 9,
    border: active
      ? "1px solid rgba(83,215,255,0.52)"
      : "1px solid rgba(255,255,255,0.12)",
    background: active ? "rgba(83,215,255,0.14)" : "rgba(255,255,255,0.04)",
    color: active ? "#c9f7ff" : "rgba(255,255,255,0.7)",
    padding: "7px 10px",
    fontSize: 11,
    fontWeight: 900,
    cursor: "pointer",
  };
}
const comparisonGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 10,
};
const previewPane: CSSProperties = {
  minWidth: 0,
  borderRadius: 13,
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(0,0,0,0.16)",
  padding: 12,
  minHeight: 250,
};
const standalonePane: CSSProperties = {
  ...previewPane,
  width: "100%",
};
const paneHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  marginBottom: 9,
};
const paneLabel: CSSProperties = {
  color: "rgba(255,255,255,0.48)",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: "0.12em",
};
const paneStepCount: CSSProperties = {
  color: "#bcefff",
  fontSize: 9,
  fontWeight: 850,
};
const stepHeader: CSSProperties = {
  minHeight: 32,
  marginBottom: 9,
  color: "rgba(255,255,255,0.82)",
  fontSize: 10,
  lineHeight: 1.4,
};
const stepControls: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};
const stepButton: CSSProperties = {
  borderRadius: 9,
  border: "1px solid rgba(255,255,255,0.13)",
  background: "rgba(255,255,255,0.055)",
  color: "white",
  padding: "7px 10px",
  fontSize: 10,
  fontWeight: 800,
};
const stepCounter: CSSProperties = {
  color: "rgba(255,255,255,0.48)",
  fontSize: 10,
  fontWeight: 800,
};
const emptyState: CSSProperties = {
  minHeight: 190,
  display: "grid",
  placeContent: "center",
  textAlign: "center",
  color: "rgba(255,255,255,0.58)",
  fontSize: 11,
  lineHeight: 1.5,
  padding: 12,
};
const issuesBox: CSSProperties = {
  borderTop: "1px solid rgba(255,255,255,0.08)",
  paddingTop: 10,
};
const issuesSummary: CSSProperties = {
  color: "rgba(255,255,255,0.72)",
  fontSize: 11,
  fontWeight: 850,
  cursor: "pointer",
};
const issueList: CSSProperties = {
  margin: "8px 0 0 18px",
  padding: 0,
  color: "rgba(255,255,255,0.62)",
  fontSize: 10,
  lineHeight: 1.5,
};
function proposalStatusStyle(status: MathAuthoringProposal["status"]): CSSProperties {
  const good = status === "generated" || status === "not_needed" || status === "preserved";
  const invalid = status === "invalid";
  return {
    borderRadius: 999,
    padding: "6px 9px",
    border: invalid
      ? "1px solid rgba(248,113,113,0.26)"
      : good
        ? "1px solid rgba(74,222,128,0.24)"
        : "1px solid rgba(251,191,36,0.26)",
    background: invalid
      ? "rgba(239,68,68,0.08)"
      : good
        ? "rgba(34,197,94,0.08)"
        : "rgba(245,158,11,0.08)",
    color: invalid ? "#fecaca" : good ? "#bbf7d0" : "#fde68a",
    fontSize: 10,
    fontWeight: 900,
  };
}
