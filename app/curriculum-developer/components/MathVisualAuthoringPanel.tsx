"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import {
  MathVisualRenderer,
  buildMathVisualStateForStep,
  getMathVisualIdsForTeachingStep,
  readMathVisualSpec,
  readMathVisualTeachingSteps,
  validateMathVisualTeachingSteps,
  type MathVisualSpec,
  type MathVisualTeachingStep,
} from "@/components/core-math/visual-engine";
import {
  MATH_VISUAL_EXAMPLES,
  type MathVisualExample,
} from "@/components/core-math/visual-engine/MathVisualExamples";
import { buildMathAuthoringQuestionFingerprint } from "@/lib/math-intelligence/MathAuthoringFingerprint";
import type { MathAuthoringProposal } from "@/lib/math-intelligence/MathAuthoringProposalTypes";
import {
  applyMathAuthoringProposalToDraft,
  inspectMathAuthoringProposalApplication,
  type MathAuthoringProposalApplicationInspection,
} from "@/lib/math-intelligence/MathAuthoringProposalApply";
import MathIntelligenceProposalPreview from "./math-intelligence/MathIntelligenceProposalPreview";
import {
  MathAuthoringProposalRequestError,
  requestMathAuthoringProposal,
} from "./math-intelligence/requestMathAuthoringProposal";

type TeachingDraft = Record<string, any>;

type ParsedVisual = {
  spec: MathVisualSpec | null;
  valid: boolean;
  source: "v2" | "v1" | "none" | "invalid";
  messages: string[];
};

type ParsedSteps = {
  steps: MathVisualTeachingStep[];
  valid: boolean;
  messages: string[];
};

export default function MathVisualAuthoringPanel({
  value,
  teaching,
  questionDraft,
  disabled = false,
  defaultOpen = false,
  onChangeVisual,
  onChangeTeaching,
  onValidityChange,
}: {
  value: unknown;
  teaching: TeachingDraft;
  questionDraft?: unknown;
  disabled?: boolean;
  defaultOpen?: boolean;
  onChangeVisual: (next: MathVisualSpec | null) => void;
  onChangeTeaching: (next: TeachingDraft) => void;
  onValidityChange?: (valid: boolean, message?: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [visualText, setVisualText] = useState(() => pretty(value));
  const [lessonStepsText, setLessonStepsText] = useState(() =>
    pretty(readLessonSteps(teaching, "lesson")),
  );
  const [teachMeStepsText, setTeachMeStepsText] = useState(() =>
    pretty(readLessonSteps(teaching, "teach_me")),
  );
  const [previewMode, setPreviewMode] = useState<"question" | "lesson" | "teach_me">(
    "question",
  );
  const [previewStep, setPreviewStep] = useState(0);
  const [proposal, setProposal] = useState<MathAuthoringProposal | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [applyNotice, setApplyNotice] = useState<string | null>(null);
  const [confirmProtectedReplace, setConfirmProtectedReplace] = useState(false);

  const currentQuestionFingerprint = useMemo(
    () =>
      questionDraft
        ? buildMathAuthoringQuestionFingerprint(questionDraft)
        : null,
    [questionDraft],
  );
  const proposalStale = Boolean(
    proposal &&
      (!currentQuestionFingerprint ||
        proposal.question_fingerprint !== currentQuestionFingerprint),
  );

  const visualResult = useMemo(() => parseVisualText(visualText), [visualText]);
  const lessonResult = useMemo(
    () => parseStepsText(lessonStepsText, visualResult.spec, "lesson.visual_steps"),
    [lessonStepsText, visualResult.spec],
  );
  const teachMeResult = useMemo(
    () => parseStepsText(teachMeStepsText, visualResult.spec, "teach_me.visual_steps"),
    [teachMeStepsText, visualResult.spec],
  );

  const applicationInspection = useMemo(
    () =>
      inspectMathAuthoringProposalApplication({
        visual: visualResult.spec,
        teaching,
      }),
    [teaching, visualResult.spec],
  );

  const overallValid =
    visualResult.valid && lessonResult.valid && teachMeResult.valid;
  const firstMessage =
    visualResult.messages[0] ||
    lessonResult.messages[0] ||
    teachMeResult.messages[0];

  useEffect(() => {
    onValidityChange?.(overallValid, firstMessage);
    // The parent callback is intentionally excluded so an inline callback does
    // not retrigger this effect on every editor render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstMessage, overallValid]);

  async function generateProposal() {
    if (disabled || generating) return;
    if (!questionDraft) {
      setGenerationError(
        "This editor has not supplied the current Math question draft to Math Intelligence.",
      );
      return;
    }

    setGenerating(true);
    setGenerationError(null);
    setApplyNotice(null);
    setConfirmProtectedReplace(false);

    try {
      const nextProposal = await requestMathAuthoringProposal(questionDraft);
      setProposal(nextProposal);
    } catch (error) {
      if (error instanceof MathAuthoringProposalRequestError) {
        setGenerationError(error.message);
      } else {
        setGenerationError(
          "Math Intelligence could not create a proposal. The question has not been changed.",
        );
      }
    } finally {
      setGenerating(false);
    }
  }

  function discardProposal() {
    setProposal(null);
    setGenerationError(null);
    setConfirmProtectedReplace(false);
    setApplyNotice("Proposal discarded. The current question draft was not changed.");
  }

  function applyProposal(replaceProtected: boolean) {
    if (!proposal) return;
    if (proposalStale) {
      setGenerationError(
        "This proposal is out of date because the Math question changed after generation. Regenerate before accepting it.",
      );
      setConfirmProtectedReplace(false);
      return;
    }

    const result = applyMathAuthoringProposalToDraft({
      currentVisual: visualResult.spec,
      currentTeaching: teaching,
      proposal,
      options: {
        allow_replace_manual: replaceProtected,
        allow_replace_reviewed: replaceProtected,
      },
    });

    if (result.status === "invalid") {
      setGenerationError(result.messages[0] || "This proposal cannot be applied.");
      return;
    }

    if (result.status === "preserved") {
      setApplyNotice(result.messages.join(" "));
      return;
    }

    setVisualText(pretty(result.visual));
    setLessonStepsText(pretty(readLessonSteps(result.teaching as TeachingDraft, "lesson")));
    setTeachMeStepsText(pretty(readLessonSteps(result.teaching as TeachingDraft, "teach_me")));
    setPreviewMode("question");
    setPreviewStep(0);

    onChangeVisual(result.visual);
    onChangeTeaching(result.teaching as TeachingDraft);

    setProposal(null);
    setConfirmProtectedReplace(false);
    setGenerationError(null);
    setApplyNotice(result.messages.join(" "));
  }

  function updateVisualText(next: string) {
    setVisualText(next);
    const parsed = parseVisualText(next);
    if (parsed.valid) onChangeVisual(parsed.spec);
  }

  function updateLessonSteps(next: string) {
    setLessonStepsText(next);
    const parsed = parseStepsText(next, visualResult.spec, "lesson.visual_steps");
    if (parsed.valid) {
      onChangeTeaching(patchVisualSteps(teaching, "lesson", parsed.steps));
    }
  }

  function updateTeachMeSteps(next: string) {
    setTeachMeStepsText(next);
    const parsed = parseStepsText(next, visualResult.spec, "teach_me.visual_steps");
    if (parsed.valid) {
      onChangeTeaching(patchVisualSteps(teaching, "teach_me", parsed.steps));
    }
  }

  function loadExample(example: MathVisualExample) {
    const nextVisualText = pretty(example.spec);
    const nextStepsText = pretty(example.teaching_steps ?? []);
    setVisualText(nextVisualText);
    setLessonStepsText(nextStepsText);
    setTeachMeStepsText("[]");
    setPreviewMode(example.teaching_steps?.length ? "lesson" : "question");
    setPreviewStep(0);
    onChangeVisual(example.spec);
    let nextTeaching = patchVisualSteps(
      teaching,
      "lesson",
      example.teaching_steps ?? [],
    );
    nextTeaching = patchVisualSteps(nextTeaching, "teach_me", []);
    onChangeTeaching(nextTeaching);
  }

  const previewSteps =
    previewMode === "lesson"
      ? lessonResult.steps
      : previewMode === "teach_me"
        ? teachMeResult.steps
        : [];
  const boundedStep = Math.max(
    0,
    Math.min(previewStep, Math.max(0, previewSteps.length - 1)),
  );
  const runtimeState =
    previewSteps.length > 0
      ? buildMathVisualStateForStep(previewSteps, boundedStep, { cumulative: true })
      : undefined;
  const referencedVisualIds =
    previewSteps.length > 0
      ? getMathVisualIdsForTeachingStep(previewSteps, boundedStep)
      : [];
  const previewVisualId = referencedVisualIds[0];

  return (
    <section style={panel}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        style={panelHeader}
        aria-expanded={open}
      >
        <span>
          <span style={eyebrow}>MATH VISUAL V2</span>
          <strong style={panelTitle}>Structured diagram + teaching preview</strong>
        </span>
        <span style={statusPill(overallValid)}>
          {overallValid ? "Valid" : "Needs attention"}
        </span>
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>

      {open ? (
        <div style={body}>
          <div style={introRow}>
            <p style={helperText}>
              Store mathematical visuals as structured V2 JSON. Raw SVG is not
              accepted here. Teaching steps target stable visual/object IDs.
            </p>
            <a
              href="/curriculum-developer/math-visual-gallery"
              target="_blank"
              rel="noreferrer"
              style={galleryLink}
            >
              Open full test gallery ↗
            </a>
          </div>

          <section style={intelligenceCard}>
            <div style={intelligenceHeader}>
              <div>
                <span style={intelligenceEyebrow}>DREAMSCAPE MATH INTELLIGENCE</span>
                <strong style={intelligenceTitle}>Generate visual + teaching proposal</strong>
                <p style={intelligenceText}>
                  Analyses the current unsaved Math question. Dreamscape rules run first;
                  Luna is used only when the mathematical interpretation remains ambiguous.
                  Generation is preview-only and does not change the question.
                </p>
              </div>
              <button
                type="button"
                disabled={disabled || generating || !questionDraft}
                onClick={() => void generateProposal()}
                style={generateButton(disabled || generating || !questionDraft)}
              >
                {generating ? "Analysing…" : proposal ? "Regenerate Proposal" : applicationInspection.has_existing_content ? "Generate Comparison" : "Generate Visual + Teaching"}
              </button>
            </div>

            {!questionDraft ? (
              <div style={generationNotice}>
                The current editor has not connected its unsaved question draft yet.
              </div>
            ) : null}

            {generationError ? (
              <div style={generationErrorBox}>{generationError}</div>
            ) : null}

            {applyNotice ? (
              <div style={applyNoticeBox}>{applyNotice}</div>
            ) : null}

            {proposalStale ? (
              <div style={staleProposalBox}>
                <strong>Question changed after generation.</strong> The proposal is now read-only.
                Regenerate it against the current unsaved question before accepting.
              </div>
            ) : null}

            {applicationInspection.has_existing_content ? (
              <OwnershipSummary inspection={applicationInspection} />
            ) : null}

            {proposal ? (
              <>
                <MathIntelligenceProposalPreview
                  proposal={proposal}
                  currentVisual={visualResult.spec}
                  currentTeaching={teaching}
                  comparison={applicationInspection.has_existing_content}
                />

                <ProposalActions
                  proposal={proposal}
                  inspection={applicationInspection}
                  disabled={disabled || generating}
                  stale={proposalStale}
                  confirmingProtectedReplace={confirmProtectedReplace}
                  onAccept={() => applyProposal(false)}
                  onRequestProtectedReplace={() => setConfirmProtectedReplace(true)}
                  onConfirmProtectedReplace={() => applyProposal(true)}
                  onCancelProtectedReplace={() => setConfirmProtectedReplace(false)}
                  onRegenerate={() => void generateProposal()}
                  onDiscard={discardProposal}
                />
              </>
            ) : (
              <div style={generationPlaceholder}>
                No proposal generated yet. The existing Math Visual JSON below remains unchanged.
              </div>
            )}
          </section>

          <div style={manualDivider}>
            <span>MANUAL / ADVANCED AUTHORING</span>
          </div>

          <div style={templateGrid}>
            {MATH_VISUAL_EXAMPLES.map((example) => (
              <button
                key={example.id}
                type="button"
                disabled={disabled}
                onClick={() => loadExample(example)}
                style={templateButton}
                title={example.description}
              >
                {example.title}
              </button>
            ))}
          </div>

          <div style={twoColumn}>
            <div style={editorColumn}>
              <label style={fieldLabel}>
                <span>Math Visual JSON</span>
                <textarea
                  value={visualText}
                  disabled={disabled}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => updateVisualText(event.target.value)}
                  rows={18}
                  spellCheck={false}
                  style={codeArea}
                  placeholder='{"schema_version":2,"visuals":[]}'
                />
              </label>

              <ValidationMessages
                title={
                  visualResult.source === "v1"
                    ? "Legacy V1 recognised — it will save as V2"
                    : "Visual validation"
                }
                valid={visualResult.valid}
                messages={visualResult.messages}
              />

              <label style={fieldLabel}>
                <span>Main lesson visual_steps</span>
                <textarea
                  value={lessonStepsText}
                  disabled={disabled}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => updateLessonSteps(event.target.value)}
                  rows={10}
                  spellCheck={false}
                  style={codeArea}
                  placeholder="[]"
                />
              </label>
              <ValidationMessages
                title="Main lesson visual-step validation"
                valid={lessonResult.valid}
                messages={lessonResult.messages}
              />

              <label style={fieldLabel}>
                <span>Teach Me visual_steps</span>
                <textarea
                  value={teachMeStepsText}
                  disabled={disabled}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => updateTeachMeSteps(event.target.value)}
                  rows={10}
                  spellCheck={false}
                  style={codeArea}
                  placeholder="[]"
                />
              </label>
              <ValidationMessages
                title="Teach Me visual-step validation"
                valid={teachMeResult.valid}
                messages={teachMeResult.messages}
              />
            </div>

            <div style={previewColumn}>
              <div style={previewToolbar}>
                {(["question", "lesson", "teach_me"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setPreviewMode(mode);
                      setPreviewStep(0);
                    }}
                    style={previewTab(previewMode === mode)}
                  >
                    {mode === "question"
                      ? "Question"
                      : mode === "lesson"
                        ? "Lesson"
                        : "Teach Me"}
                  </button>
                ))}
              </div>

              <div style={previewCard}>
                {!visualResult.spec ? (
                  <p style={emptyPreview}>
                    Add a valid Math Visual V2 spec to preview it here.
                  </p>
                ) : (
                  <>
                    {previewMode !== "question" && previewSteps.length > 0 ? (
                      <div style={stepHeader}>
                        <strong>
                          Step {boundedStep + 1} of {previewSteps.length}
                        </strong>
                        <span>{previewSteps[boundedStep]?.text || "Visual step"}</span>
                      </div>
                    ) : null}

                    <MathVisualRenderer
                      spec={visualResult.spec}
                      visualId={previewVisualId}
                      placement={previewVisualId ? undefined : "prompt"}
                      runtimeState={runtimeState}
                      size="large"
                      showTitle
                    />

                    {previewMode !== "question" && previewSteps.length > 0 ? (
                      <div style={stepControls}>
                        <button
                          type="button"
                          disabled={boundedStep <= 0}
                          onClick={() => setPreviewStep((value) => Math.max(0, value - 1))}
                          style={stepButton}
                        >
                          ← Back
                        </button>
                        <button
                          type="button"
                          disabled={boundedStep >= previewSteps.length - 1}
                          onClick={() =>
                            setPreviewStep((value) =>
                              Math.min(previewSteps.length - 1, value + 1),
                            )
                          }
                          style={stepButton}
                        >
                          Next →
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function OwnershipSummary({
  inspection,
}: {
  inspection: MathAuthoringProposalApplicationInspection;
}) {
  return (
    <div style={ownershipShell}>
      <span style={ownershipTitle}>CURRENT AUTHORING OWNERSHIP</span>
      <div style={ownershipPills}>
        <OwnershipPill label="Visual" status={inspection.visual.status} />
        <OwnershipPill label="Lesson" status={inspection.lesson.status} />
        <OwnershipPill label="Teach Me" status={inspection.teach_me.status} />
      </div>
      {inspection.has_locked_content ? (
        <span style={ownershipNote}>
          Locked content is never replaced by Math Intelligence.
        </span>
      ) : inspection.requires_explicit_replace ? (
        <span style={ownershipNote}>
          Manual or reviewed generated content requires an explicit Use Proposal confirmation.
        </span>
      ) : null}
    </div>
  );
}

function OwnershipPill({ label, status }: { label: string; status: string }) {
  return (
    <span style={ownershipPill(status)}>
      {label}: {humaniseStatus(status)}
    </span>
  );
}

function ProposalActions({
  proposal,
  inspection,
  disabled,
  stale,
  confirmingProtectedReplace,
  onAccept,
  onRequestProtectedReplace,
  onConfirmProtectedReplace,
  onCancelProtectedReplace,
  onRegenerate,
  onDiscard,
}: {
  proposal: MathAuthoringProposal;
  inspection: MathAuthoringProposalApplicationInspection;
  disabled: boolean;
  stale: boolean;
  confirmingProtectedReplace: boolean;
  onAccept: () => void;
  onRequestProtectedReplace: () => void;
  onConfirmProtectedReplace: () => void;
  onCancelProtectedReplace: () => void;
  onRegenerate: () => void;
  onDiscard: () => void;
}) {
  const canApply = Boolean(
    !stale && proposal.can_accept.visual && proposal.visual.spec,
  );
  const visualLocked = inspection.visual.status === "locked";
  const needsProtectedConfirmation = inspection.requires_explicit_replace;

  return (
    <div style={proposalActionsShell}>
      {confirmingProtectedReplace ? (
        <div style={protectedConfirmBox}>
          <strong style={protectedConfirmTitle}>Replace protected current content?</strong>
          <span style={protectedConfirmText}>
            This is an explicit authoring action. Manual and reviewed generated visual-teaching
            content that has a corresponding proposal will be replaced in the local draft.
            Locked content will still be preserved.
          </span>
          <div style={proposalButtonRow}>
            <button
              type="button"
              disabled={disabled || visualLocked || stale}
              onClick={onConfirmProtectedReplace}
              style={dangerActionButton(disabled || visualLocked || stale)}
            >
              Confirm Use Proposal
            </button>
            <button type="button" disabled={disabled} onClick={onCancelProtectedReplace} style={secondaryActionButton}>
              Cancel
            </button>
          </div>
          {visualLocked ? (
            <span style={lockedActionNote}>
              The current visual itself is locked, so this proposal cannot replace it.
            </span>
          ) : null}
        </div>
      ) : (
        <div style={proposalButtonRow}>
          {canApply && !visualLocked ? (
            needsProtectedConfirmation ? (
              <button
                type="button"
                disabled={disabled}
                onClick={onRequestProtectedReplace}
                style={primaryActionButton(disabled)}
              >
                Use Proposal
              </button>
            ) : (
              <button
                type="button"
                disabled={disabled}
                onClick={onAccept}
                style={primaryActionButton(disabled)}
              >
                Accept Proposal
              </button>
            )
          ) : null}

          <button type="button" disabled={disabled} onClick={onRegenerate} style={secondaryActionButton}>
            Regenerate
          </button>
          <button type="button" disabled={disabled} onClick={onDiscard} style={secondaryActionButton}>
            {inspection.has_existing_content ? "Keep Current / Discard" : "Discard"}
          </button>
        </div>
      )}

      {stale ? (
        <span style={actionHint}>
          This proposal no longer matches the current question draft. Regenerate before accepting it.
        </span>
      ) : !canApply ? (
        <span style={actionHint}>
          This proposal is preview-only because the generated visual did not pass the full acceptability gate.
        </span>
      ) : visualLocked ? (
        <span style={actionHint}>
          The current Math Visual is locked. Generate and inspect proposals if useful, but they cannot replace the locked visual.
        </span>
      ) : (
        <span style={actionHint}>
          Accepting changes only the local editor draft. Use the existing question Save action to persist it.
        </span>
      )}
    </div>
  );
}

function humaniseStatus(value: string) {
  if (value === "none") return "None";
  if (value === "generated_reviewed") return "Generated · Reviewed";
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function parseVisualText(text: string): ParsedVisual {
  if (!text.trim()) {
    return { spec: null, valid: true, source: "none", messages: [] };
  }

  try {
    const raw = JSON.parse(text);
    const result = readMathVisualSpec(raw);
    return {
      spec: result.spec,
      valid: Boolean(result.spec) && result.valid,
      source: result.source,
      messages: result.issues.map((issue) => `${issue.path}: ${issue.message}`),
    };
  } catch (error: any) {
    return {
      spec: null,
      valid: false,
      source: "invalid",
      messages: [error?.message || "Math Visual JSON is invalid."],
    };
  }
}

function parseStepsText(
  text: string,
  spec: MathVisualSpec | null,
  path: string,
): ParsedSteps {
  if (!text.trim()) return { steps: [], valid: true, messages: [] };

  try {
    const raw = JSON.parse(text);
    const read = readMathVisualTeachingSteps(raw);
    const messages = read.issues.map((issue) => `${path}.${issue.path}: ${issue.message}`);
    if (read.issues.length > 0) {
      return { steps: read.steps, valid: false, messages };
    }

    if (read.steps.length === 0) return { steps: [], valid: true, messages: [] };
    if (!spec) {
      return {
        steps: read.steps,
        valid: false,
        messages: [`${path}: add a valid math_visual before using visual_steps.`],
      };
    }

    const validation = validateMathVisualTeachingSteps(spec, read.steps, path);
    const validationMessages = validation.issues.map(
      (issue) => `${issue.path}: ${issue.message}`,
    );
    return {
      steps: read.steps,
      valid: validation.valid,
      messages: [...messages, ...validationMessages],
    };
  } catch (error: any) {
    return {
      steps: [],
      valid: false,
      messages: [error?.message || `${path} JSON is invalid.`],
    };
  }
}

function patchVisualSteps(
  teaching: TeachingDraft,
  key: "lesson" | "teach_me",
  steps: MathVisualTeachingStep[],
) {
  const next = deepClone(teaching);
  const current = next[key];
  const lesson =
    typeof current === "string"
      ? { text: current }
      : current && typeof current === "object" && !Array.isArray(current)
        ? { ...current }
        : {};

  if (steps.length > 0) lesson.visual_steps = steps;
  else delete lesson.visual_steps;

  if (Object.keys(lesson).length > 0) next[key] = lesson;
  else delete next[key];
  return next;
}

function readLessonSteps(teaching: TeachingDraft, key: "lesson" | "teach_me") {
  const lesson = teaching?.[key];
  if (!lesson || typeof lesson !== "object" || Array.isArray(lesson)) return [];
  return Array.isArray(lesson.visual_steps) ? lesson.visual_steps : [];
}

function deepClone<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

function pretty(value: unknown) {
  if (value == null) return "";
  if (Array.isArray(value) && value.length === 0) return "[]";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

function ValidationMessages({
  title,
  valid,
  messages,
}: {
  title: string;
  valid: boolean;
  messages: string[];
}) {
  const errors = messages.slice(0, 6);
  return (
    <div style={validationBox(valid)}>
      <strong>{valid ? `✓ ${title}` : `⚠ ${title}`}</strong>
      {errors.length > 0 ? (
        <ul style={messageList}>
          {errors.map((message, index) => (
            <li key={`${message}-${index}`}>{message}</li>
          ))}
        </ul>
      ) : (
        <span style={validationHint}>{valid ? "No blocking errors." : "Review the JSON above."}</span>
      )}
    </div>
  );
}

const panel: CSSProperties = {
  marginTop: 14,
  borderRadius: 16,
  border: "1px solid rgba(83,215,255,0.22)",
  background: "rgba(4,18,38,0.72)",
  overflow: "hidden",
};

const panelHeader: CSSProperties = {
  width: "100%",
  border: 0,
  background: "linear-gradient(90deg, rgba(83,215,255,0.08), rgba(168,85,247,0.06))",
  color: "white",
  padding: "14px 16px",
  display: "grid",
  gridTemplateColumns: "1fr auto auto",
  alignItems: "center",
  gap: 12,
  textAlign: "left",
  cursor: "pointer",
};

const eyebrow: CSSProperties = {
  display: "block",
  color: "#8ee8ff",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: "0.14em",
  marginBottom: 5,
};

const panelTitle: CSSProperties = { display: "block", fontSize: 15 };
const body: CSSProperties = { padding: 16, display: "grid", gap: 14 };
const introRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 14,
  flexWrap: "wrap",
};
const helperText: CSSProperties = {
  margin: 0,
  color: "rgba(255,255,255,0.65)",
  fontSize: 12,
  lineHeight: 1.5,
  maxWidth: 760,
};
const galleryLink: CSSProperties = { color: "#9eeeff", fontSize: 12, fontWeight: 800 };
const intelligenceCard: CSSProperties = {
  borderRadius: 15,
  border: "1px solid rgba(83,215,255,0.2)",
  background: "linear-gradient(180deg, rgba(14,48,79,0.42), rgba(7,25,48,0.34))",
  padding: 14,
  display: "grid",
  gap: 12,
};
const intelligenceHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "flex-start",
  flexWrap: "wrap",
};
const intelligenceEyebrow: CSSProperties = {
  display: "block",
  color: "#8ee8ff",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: "0.14em",
  marginBottom: 5,
};
const intelligenceTitle: CSSProperties = {
  display: "block",
  color: "white",
  fontSize: 14,
};
const intelligenceText: CSSProperties = {
  margin: "5px 0 0",
  color: "rgba(255,255,255,0.58)",
  fontSize: 11,
  lineHeight: 1.5,
  maxWidth: 760,
};
function generateButton(blocked: boolean): CSSProperties {
  return {
    borderRadius: 11,
    border: "1px solid rgba(83,215,255,0.44)",
    background: "linear-gradient(135deg, rgba(14,165,233,0.22), rgba(139,92,246,0.2))",
    color: "#e5fbff",
    padding: "10px 13px",
    fontSize: 11,
    fontWeight: 900,
    cursor: blocked ? "not-allowed" : "pointer",
    opacity: blocked ? 0.48 : 1,
    whiteSpace: "nowrap",
  };
}
const generationNotice: CSSProperties = {
  borderRadius: 9,
  border: "1px solid rgba(251,191,36,0.2)",
  background: "rgba(245,158,11,0.07)",
  color: "#fde68a",
  padding: "8px 10px",
  fontSize: 10,
};
const generationErrorBox: CSSProperties = {
  borderRadius: 9,
  border: "1px solid rgba(248,113,113,0.24)",
  background: "rgba(239,68,68,0.08)",
  color: "#fecaca",
  padding: "9px 10px",
  fontSize: 10,
  lineHeight: 1.45,
};
const generationPlaceholder: CSSProperties = {
  borderRadius: 10,
  border: "1px dashed rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.46)",
  padding: "10px 11px",
  fontSize: 10,
  lineHeight: 1.45,
};
const applyNoticeBox: CSSProperties = {
  borderRadius: 9,
  border: "1px solid rgba(74,222,128,0.22)",
  background: "rgba(34,197,94,0.07)",
  color: "#bbf7d0",
  padding: "9px 10px",
  fontSize: 10,
  lineHeight: 1.45,
};
const staleProposalBox: CSSProperties = {
  borderRadius: 9,
  border: "1px solid rgba(251,191,36,0.28)",
  background: "rgba(245,158,11,0.09)",
  color: "#fde68a",
  padding: "9px 10px",
  fontSize: 10,
  lineHeight: 1.5,
};
const ownershipShell: CSSProperties = {
  borderRadius: 11,
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(255,255,255,0.035)",
  padding: 10,
  display: "grid",
  gap: 7,
};
const ownershipTitle: CSSProperties = {
  color: "rgba(255,255,255,0.46)",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: "0.1em",
};
const ownershipPills: CSSProperties = {
  display: "flex",
  gap: 7,
  flexWrap: "wrap",
};
function ownershipPill(status: string): CSSProperties {
  const protectedState = status === "manual" || status === "generated_reviewed";
  const locked = status === "locked";
  return {
    borderRadius: 999,
    border: locked
      ? "1px solid rgba(248,113,113,0.25)"
      : protectedState
        ? "1px solid rgba(251,191,36,0.24)"
        : "1px solid rgba(83,215,255,0.18)",
    background: locked
      ? "rgba(239,68,68,0.07)"
      : protectedState
        ? "rgba(245,158,11,0.07)"
        : "rgba(14,165,233,0.06)",
    color: locked ? "#fecaca" : protectedState ? "#fde68a" : "#c7f5ff",
    padding: "5px 8px",
    fontSize: 9,
    fontWeight: 850,
  };
}
const ownershipNote: CSSProperties = {
  color: "rgba(255,255,255,0.54)",
  fontSize: 10,
  lineHeight: 1.4,
};
const proposalActionsShell: CSSProperties = {
  borderTop: "1px solid rgba(255,255,255,0.08)",
  paddingTop: 11,
  display: "grid",
  gap: 8,
};
const proposalButtonRow: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
};
function primaryActionButton(blocked: boolean): CSSProperties {
  return {
    borderRadius: 10,
    border: "1px solid rgba(74,222,128,0.34)",
    background: "rgba(34,197,94,0.13)",
    color: "#d8ffe4",
    padding: "8px 11px",
    fontSize: 10,
    fontWeight: 900,
    cursor: blocked ? "not-allowed" : "pointer",
    opacity: blocked ? 0.48 : 1,
  };
}
function dangerActionButton(blocked: boolean): CSSProperties {
  return {
    borderRadius: 10,
    border: "1px solid rgba(251,191,36,0.34)",
    background: "rgba(245,158,11,0.12)",
    color: "#fff0b8",
    padding: "8px 11px",
    fontSize: 10,
    fontWeight: 900,
    cursor: blocked ? "not-allowed" : "pointer",
    opacity: blocked ? 0.48 : 1,
  };
}
const secondaryActionButton: CSSProperties = {
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.13)",
  background: "rgba(255,255,255,0.045)",
  color: "rgba(255,255,255,0.82)",
  padding: "8px 11px",
  fontSize: 10,
  fontWeight: 850,
  cursor: "pointer",
};
const actionHint: CSSProperties = {
  color: "rgba(255,255,255,0.48)",
  fontSize: 10,
  lineHeight: 1.4,
};
const protectedConfirmBox: CSSProperties = {
  borderRadius: 11,
  border: "1px solid rgba(251,191,36,0.24)",
  background: "rgba(245,158,11,0.07)",
  padding: 11,
  display: "grid",
  gap: 7,
};
const protectedConfirmTitle: CSSProperties = {
  color: "#fde68a",
  fontSize: 11,
};
const protectedConfirmText: CSSProperties = {
  color: "rgba(255,255,255,0.68)",
  fontSize: 10,
  lineHeight: 1.45,
};
const lockedActionNote: CSSProperties = {
  color: "#fecaca",
  fontSize: 10,
};

const manualDivider: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "rgba(255,255,255,0.4)",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: "0.12em",
  borderTop: "1px solid rgba(255,255,255,0.08)",
  paddingTop: 12,
};
const templateGrid: CSSProperties = {
  display: "flex",
  gap: 7,
  flexWrap: "wrap",
};
const templateButton: CSSProperties = {
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.055)",
  color: "rgba(255,255,255,0.86)",
  padding: "7px 10px",
  fontSize: 11,
  fontWeight: 800,
  cursor: "pointer",
};
const twoColumn: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
  gap: 16,
  alignItems: "start",
};
const editorColumn: CSSProperties = { display: "grid", gap: 10, minWidth: 0 };
const previewColumn: CSSProperties = { display: "grid", gap: 8, minWidth: 0, position: "sticky", top: 8 };
const fieldLabel: CSSProperties = {
  display: "grid",
  gap: 6,
  color: "rgba(255,255,255,0.8)",
  fontSize: 11,
  fontWeight: 800,
};
const codeArea: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 11,
  border: "1px solid rgba(255,255,255,0.13)",
  background: "rgba(0,0,0,0.26)",
  color: "#dff8ff",
  padding: 11,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  fontSize: 11,
  lineHeight: 1.45,
  resize: "vertical",
};
const previewToolbar: CSSProperties = { display: "flex", gap: 6, flexWrap: "wrap" };
function previewTab(active: boolean): CSSProperties {
  return {
    borderRadius: 9,
    border: active ? "1px solid rgba(83,215,255,0.52)" : "1px solid rgba(255,255,255,0.12)",
    background: active ? "rgba(83,215,255,0.14)" : "rgba(255,255,255,0.04)",
    color: active ? "#c9f7ff" : "rgba(255,255,255,0.7)",
    padding: "7px 10px",
    fontSize: 11,
    fontWeight: 900,
    cursor: "pointer",
  };
}
const previewCard: CSSProperties = {
  borderRadius: 15,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.035)",
  padding: 14,
  minHeight: 300,
};
const emptyPreview: CSSProperties = { color: "rgba(255,255,255,0.48)", fontSize: 12 };
const stepHeader: CSSProperties = {
  display: "grid",
  gap: 4,
  marginBottom: 10,
  color: "rgba(255,255,255,0.82)",
  fontSize: 12,
};
const stepControls: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  marginTop: 12,
};
const stepButton: CSSProperties = {
  borderRadius: 9,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.055)",
  color: "white",
  padding: "8px 11px",
  fontSize: 11,
  fontWeight: 800,
};
function statusPill(valid: boolean): CSSProperties {
  return {
    borderRadius: 999,
    padding: "5px 8px",
    fontSize: 9,
    fontWeight: 900,
    border: valid ? "1px solid rgba(74,222,128,0.28)" : "1px solid rgba(251,191,36,0.3)",
    background: valid ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
    color: valid ? "#bbf7d0" : "#fde68a",
  };
}
function validationBox(valid: boolean): CSSProperties {
  return {
    borderRadius: 9,
    border: valid ? "1px solid rgba(74,222,128,0.16)" : "1px solid rgba(248,113,113,0.22)",
    background: valid ? "rgba(34,197,94,0.055)" : "rgba(239,68,68,0.07)",
    color: valid ? "#c7f9d5" : "#fecaca",
    padding: "8px 10px",
    fontSize: 10,
    lineHeight: 1.45,
    display: "grid",
    gap: 4,
  };
}
const messageList: CSSProperties = { margin: "2px 0 0 16px", padding: 0 };
const validationHint: CSSProperties = { opacity: 0.72 };
