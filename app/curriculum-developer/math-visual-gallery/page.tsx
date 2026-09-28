"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import {
  MathVisualRenderer,
  buildMathVisualStateForStep,
  validateMathVisualSpec,
  validateMathVisualTeachingSteps,
} from "@/components/core-math/visual-engine";
import {
  MATH_VISUAL_EXAMPLES,
  type MathVisualExample,
} from "@/components/core-math/visual-engine/MathVisualExamples";

export default function MathVisualGalleryPage() {
  return (
    <main style={page}>
      <header style={header}>
        <div>
          <p style={eyebrow}>CURRICULUM DEVELOPER · MATH VISUAL V2</p>
          <h1 style={title}>Math Visual Test Gallery</h1>
          <p style={subtitle}>
            Deterministic renderer QA. Every example below is generated from the
            same structured Math Visual V2 schema used by Core Missions and the
            Teaching Engine.
          </p>
        </div>
        <a href="/curriculum-developer" style={backLink}>← Curriculum Developer</a>
      </header>

      <section style={summaryGrid}>
        <SummaryCard label="Schema" value="V2" />
        <SummaryCard label="Examples" value={String(MATH_VISUAL_EXAMPLES.length)} />
        <SummaryCard label="Renderer" value="SVG DOM" />
        <SummaryCard label="Raw SVG storage" value="Not used" />
      </section>

      <section style={galleryGrid}>
        {MATH_VISUAL_EXAMPLES.map((example) => (
          <GalleryCard key={example.id} example={example} />
        ))}
      </section>
    </main>
  );
}

function GalleryCard({ example }: { example: MathVisualExample }) {
  const [stepIndex, setStepIndex] = useState(0);
  const visualValidation = validateMathVisualSpec(example.spec);
  const teachingValidation = example.teaching_steps?.length
    ? validateMathVisualTeachingSteps(example.spec, example.teaching_steps)
    : null;
  const valid = visualValidation.valid && (teachingValidation?.valid ?? true);
  const steps = example.teaching_steps ?? [];
  const boundedStep = Math.max(0, Math.min(stepIndex, Math.max(0, steps.length - 1)));
  const runtimeState = steps.length
    ? buildMathVisualStateForStep(steps, boundedStep, { cumulative: true })
    : undefined;
  const visualId = steps[boundedStep]?.actions?.[0]?.visual_id;

  return (
    <article style={card}>
      <div style={cardHeader}>
        <div>
          <p style={cardEyebrow}>{example.id}</p>
          <h2 style={cardTitle}>{example.title}</h2>
          <p style={cardDescription}>{example.description}</p>
        </div>
        <span style={status(valid)}>{valid ? "VALID" : "CHECK"}</span>
      </div>

      <div style={renderSurface}>
        <MathVisualRenderer
          spec={example.spec}
          visualId={visualId}
          placement={visualId ? undefined : "prompt"}
          runtimeState={runtimeState}
          size="large"
          showTitle
        />
      </div>

      {steps.length > 0 ? (
        <div style={teachingPanel}>
          <div style={stepText}>
            <strong>Teaching step {boundedStep + 1} of {steps.length}</strong>
            <span>{steps[boundedStep]?.text || "Visual teaching state"}</span>
          </div>
          <div style={stepRow}>
            <button
              type="button"
              style={stepButton}
              disabled={boundedStep === 0}
              onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
            >
              ← Back
            </button>
            <div style={dots}>
              {steps.map((step, index) => (
                <button
                  key={step.id || index}
                  type="button"
                  aria-label={`Teaching step ${index + 1}`}
                  onClick={() => setStepIndex(index)}
                  style={dot(index === boundedStep)}
                />
              ))}
            </div>
            <button
              type="button"
              style={stepButton}
              disabled={boundedStep >= steps.length - 1}
              onClick={() =>
                setStepIndex((value) => Math.min(steps.length - 1, value + 1))
              }
            >
              Next →
            </button>
          </div>
        </div>
      ) : null}

      {!valid ? (
        <div style={errorBox}>
          {[...visualValidation.issues, ...(teachingValidation?.issues ?? [])]
            .slice(0, 6)
            .map((issue) => (
              <div key={`${issue.code}-${issue.path}`}>
                {issue.path}: {issue.message}
              </div>
            ))}
        </div>
      ) : null}

      <details style={jsonDetails}>
        <summary style={summary}>View V2 JSON</summary>
        <pre style={pre}>{JSON.stringify(example.spec, null, 2)}</pre>
      </details>
    </article>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={summaryCard}>
      <span style={summaryLabel}>{label}</span>
      <strong style={summaryValue}>{value}</strong>
    </div>
  );
}

const page: CSSProperties = {
  minHeight: "100vh",
  background: "#061226",
  color: "white",
  padding: "clamp(18px, 3vw, 42px)",
  boxSizing: "border-box",
};
const header: CSSProperties = {
  maxWidth: 1500,
  margin: "0 auto 22px",
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
  alignItems: "flex-start",
  flexWrap: "wrap",
};
const eyebrow: CSSProperties = {
  margin: 0,
  color: "#75e6ff",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "0.16em",
};
const title: CSSProperties = {
  margin: "8px 0 0",
  fontSize: "clamp(30px, 4vw, 48px)",
  letterSpacing: "-0.035em",
};
const subtitle: CSSProperties = {
  maxWidth: 850,
  margin: "10px 0 0",
  color: "rgba(255,255,255,0.62)",
  lineHeight: 1.55,
};
const backLink: CSSProperties = {
  color: "#bdefff",
  textDecoration: "none",
  fontWeight: 800,
  fontSize: 13,
  padding: "9px 12px",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
};
const summaryGrid: CSSProperties = {
  maxWidth: 1500,
  margin: "0 auto 22px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
};
const summaryCard: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  background: "rgba(255,255,255,0.035)",
  padding: 14,
  display: "grid",
  gap: 5,
};
const summaryLabel: CSSProperties = {
  color: "rgba(255,255,255,0.45)",
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase",
};
const summaryValue: CSSProperties = { fontSize: 18 };
const galleryGrid: CSSProperties = {
  maxWidth: 1500,
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 520px), 1fr))",
  gap: 16,
};
const card: CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.035)",
  padding: 16,
  display: "grid",
  gap: 14,
  minWidth: 0,
};
const cardHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
};
const cardEyebrow: CSSProperties = {
  margin: 0,
  fontSize: 9,
  color: "#8ee8ff",
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};
const cardTitle: CSSProperties = { margin: "5px 0 0", fontSize: 20 };
const cardDescription: CSSProperties = {
  margin: "5px 0 0",
  color: "rgba(255,255,255,0.55)",
  fontSize: 12,
  lineHeight: 1.45,
};
function status(valid: boolean): CSSProperties {
  return {
    flex: "0 0 auto",
    borderRadius: 999,
    padding: "5px 8px",
    fontSize: 9,
    fontWeight: 900,
    color: valid ? "#bbf7d0" : "#fecaca",
    border: valid
      ? "1px solid rgba(74,222,128,0.25)"
      : "1px solid rgba(248,113,113,0.28)",
    background: valid ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
  };
}
const renderSurface: CSSProperties = {
  borderRadius: 14,
  background: "#eef6ff",
  padding: 12,
  minHeight: 260,
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
};
const teachingPanel: CSSProperties = {
  borderRadius: 12,
  border: "1px solid rgba(83,215,255,0.15)",
  background: "rgba(83,215,255,0.05)",
  padding: 11,
  display: "grid",
  gap: 9,
};
const stepText: CSSProperties = {
  display: "grid",
  gap: 3,
  fontSize: 11,
  color: "rgba(255,255,255,0.74)",
};
const stepRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  gap: 10,
  alignItems: "center",
};
const stepButton: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 9,
  background: "rgba(255,255,255,0.05)",
  color: "white",
  padding: "7px 10px",
  fontSize: 10,
  fontWeight: 800,
};
const dots: CSSProperties = { display: "flex", justifyContent: "center", gap: 6 };
function dot(active: boolean): CSSProperties {
  return {
    width: active ? 18 : 7,
    height: 7,
    borderRadius: 999,
    border: 0,
    background: active ? "#74e6ff" : "rgba(255,255,255,0.22)",
    padding: 0,
    cursor: "pointer",
  };
}
const errorBox: CSSProperties = {
  border: "1px solid rgba(248,113,113,0.22)",
  background: "rgba(239,68,68,0.08)",
  color: "#fecaca",
  borderRadius: 10,
  padding: 10,
  fontSize: 10,
  lineHeight: 1.45,
};
const jsonDetails: CSSProperties = {
  borderTop: "1px solid rgba(255,255,255,0.08)",
  paddingTop: 10,
};
const summary: CSSProperties = { cursor: "pointer", fontSize: 11, fontWeight: 800 };
const pre: CSSProperties = {
  margin: "10px 0 0",
  borderRadius: 10,
  background: "rgba(0,0,0,0.26)",
  color: "#dff8ff",
  padding: 12,
  fontSize: 10,
  lineHeight: 1.45,
  overflowX: "auto",
  whiteSpace: "pre-wrap",
};
