"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  MathVisualRenderer,
  buildMathVisualStateForStep,
  getMathVisualIdsForTeachingStep,
  getMathVisualTeachingStepSource,
  readMathVisualSpec,
  readMathVisualTeachingSteps,
  validateMathVisualTeachingSteps,
} from "@/components/core-math/visual-engine";
import type { QuizQuestion } from "../../CoreQuizTypes";
import type { NormalisedTeachingLesson } from "../TeachingTypes";

export default function MathTeachingVisualSteps({
  question,
  lesson,
}: {
  question: QuizQuestion;
  lesson: NormalisedTeachingLesson;
}) {
  const visualResult = useMemo(
    () => readMathVisualSpec(question.content?.math_visual),
    [question.content?.math_visual],
  );

  const stepsResult = useMemo(
    () =>
      readMathVisualTeachingSteps(
        getMathVisualTeachingStepSource(lesson.source),
      ),
    [lesson.source],
  );

  const steps = stepsResult.steps;
  const spec = visualResult.spec;

  const validation = useMemo(
    () =>
      spec && steps.length > 0
        ? validateMathVisualTeachingSteps(spec, steps)
        : null,
    [spec, steps],
  );

  const [stepIndex, setStepIndex] = useState(0);

  if (!spec || steps.length === 0 || !validation?.valid) return null;

  const boundedStepIndex = Math.min(stepIndex, steps.length - 1);
  const currentStep = steps[boundedStepIndex];
  const runtimeState = buildMathVisualStateForStep(steps, boundedStepIndex, {
    cumulative: true,
  });

  let visualIds = getMathVisualIdsForTeachingStep(steps, boundedStepIndex);

  if (visualIds.length === 0) {
    const preferred =
      spec.visuals.find((visual) => visual.placement === "teaching") ??
      spec.visuals.find((visual) => visual.placement === "prompt");
    visualIds = preferred ? [preferred.id] : [];
  }

  if (visualIds.length === 0) return null;

  const multipleSteps = steps.length > 1;

  return (
    <section
      data-math-teaching-visual="v2"
      data-math-teaching-step={boundedStepIndex + 1}
      style={panel}
      aria-label="Visual teaching steps"
    >
      <div style={headerRow}>
        <div>
          <p style={eyebrow}>NOVA VISUAL GUIDE</p>
          <p style={stepCounter}>
            {multipleSteps
              ? `Step ${boundedStepIndex + 1} of ${steps.length}`
              : "Visual explanation"}
          </p>
        </div>

        {multipleSteps ? (
          <div style={controls}>
            <button
              type="button"
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              disabled={boundedStepIndex === 0}
              style={navButton(boundedStepIndex === 0)}
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() =>
                setStepIndex((current) => Math.min(steps.length - 1, current + 1))
              }
              disabled={boundedStepIndex >= steps.length - 1}
              style={navButton(boundedStepIndex >= steps.length - 1, true)}
            >
              Next →
            </button>
          </div>
        ) : null}
      </div>

      {currentStep?.text ? <p style={stepText}>{currentStep.text}</p> : null}

      <div style={visualStack}>
        {visualIds.map((visualId) => (
          <MathVisualRenderer
            key={visualId}
            spec={spec}
            visualId={visualId}
            runtimeState={runtimeState}
            size="large"
          />
        ))}
      </div>

      {multipleSteps ? (
        <div style={dots} aria-hidden="true">
          {steps.map((_, index) => (
            <span
              key={index}
              style={dot(index === boundedStepIndex)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

const panel: CSSProperties = {
  border: "1px solid rgba(83,215,255,0.20)",
  borderRadius: "18px",
  background: "linear-gradient(180deg, rgba(8,35,60,0.78), rgba(7,24,48,0.62))",
  padding: "clamp(12px, 1.6vw, 18px)",
  marginBottom: "16px",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
};

const headerRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "10px",
};

const eyebrow: CSSProperties = {
  margin: 0,
  color: "#8ee8ff",
  fontSize: "10px",
  lineHeight: 1,
  fontWeight: 900,
  letterSpacing: "0.13em",
};

const stepCounter: CSSProperties = {
  margin: "5px 0 0",
  color: "rgba(255,255,255,0.68)",
  fontSize: "12px",
  fontWeight: 800,
};

const stepText: CSSProperties = {
  margin: "2px 0 12px",
  color: "rgba(255,255,255,0.92)",
  fontSize: "clamp(14px, 1.05vw, 17px)",
  lineHeight: 1.5,
  fontWeight: 700,
};

const controls: CSSProperties = {
  display: "flex",
  gap: "7px",
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

function navButton(disabled: boolean, primary = false): CSSProperties {
  return {
    border: primary
      ? "1px solid rgba(83,215,255,0.34)"
      : "1px solid rgba(255,255,255,0.12)",
    borderRadius: "10px",
    background: primary ? "rgba(83,215,255,0.12)" : "rgba(255,255,255,0.05)",
    color: primary ? "#c9f7ff" : "rgba(255,255,255,0.82)",
    padding: "7px 10px",
    fontSize: "11px",
    fontWeight: 900,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.38 : 1,
  };
}

const visualStack: CSSProperties = {
  display: "grid",
  gap: "10px",
  width: "100%",
  minWidth: 0,
};

const dots: CSSProperties = {
  marginTop: "10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
};

function dot(active: boolean): CSSProperties {
  return {
    width: active ? "18px" : "7px",
    height: "7px",
    borderRadius: "999px",
    background: active ? "#72e5ff" : "rgba(255,255,255,0.22)",
    transition: "width 160ms ease, background 160ms ease",
  };
}
