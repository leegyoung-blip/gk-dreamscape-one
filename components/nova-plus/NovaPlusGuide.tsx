"use client";

import type { NovaPlusTab } from "@/lib/nova-plus/types";
import styles from "./NovaPlusGuide.module.css";

export type NovaPlusGuideStep = {
  eyebrow: string;
  title: string;
  text: string;
  tab?: NovaPlusTab;
  target?: "add-work";
};

export const NOVA_PLUS_GUIDE_STEPS: NovaPlusGuideStep[] = [
  {
    eyebrow: "START HERE",
    title: "Add real schoolwork",
    text: "Use Add Work to upload worksheets, homework or marked papers. Approved items become supporting evidence in NOVA+.",
    target: "add-work",
  },
  {
    eyebrow: "1 OF 6 · MY LEARNING",
    title: "See the overall picture",
    text: "Start here for subject performance, recent activity and the main signals Nova is seeing.",
    tab: "learning",
  },
  {
    eyebrow: "2 OF 6 · STRENGTHS & GAPS",
    title: "Find what is secure and what needs work",
    text: "Concepts are grouped as Strong, Developing or Needs Attention. Open Why? to see the evidence.",
    tab: "strengths",
  },
  {
    eyebrow: "3 OF 6 · MASTERY MAP",
    title: "Explore the curriculum",
    text: "Choose a subject and topic, then select a concept to see mastery, progress and teaching signals.",
    tab: "mastery",
  },
  {
    eyebrow: "4 OF 6 · NOVA RECOMMENDS",
    title: "Know what to work on next",
    text: "Nova surfaces a small number of evidence-backed next steps and explains why each one matters.",
    tab: "recommendations",
  },
  {
    eyebrow: "5 OF 6 · PROGRESS",
    title: "Watch change over time",
    text: "Use Progress to see whether practice is turning into stronger performance and more secure concepts.",
    tab: "progress",
  },
  {
    eyebrow: "6 OF 6 · PARENT REPORT",
    title: "Turn the data into a simple report",
    text: "Choose a timeframe and download a concise summary for home or school discussions.",
    tab: "parent",
  },
];

type Props = {
  open: boolean;
  accountName: string;
  stepIndex: number;
  onStepChange: (index: number) => void;
  onSelectTab: (tab: NovaPlusTab) => void;
  onClose: () => void;
};

export default function NovaPlusGuide({
  open,
  accountName,
  stepIndex,
  onStepChange,
  onSelectTab,
  onClose,
}: Props) {
  if (!open) return null;

  const step = NOVA_PLUS_GUIDE_STEPS[stepIndex] ?? NOVA_PLUS_GUIDE_STEPS[0];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === NOVA_PLUS_GUIDE_STEPS.length - 1;

  function go(index: number) {
    const bounded = Math.max(0, Math.min(index, NOVA_PLUS_GUIDE_STEPS.length - 1));
    const next = NOVA_PLUS_GUIDE_STEPS[bounded];
    onStepChange(bounded);
    if (next.tab) onSelectTab(next.tab);
  }

  return (
    <aside className={styles.panel} aria-label="NOVA+ guide" aria-live="polite">
      <div className={styles.topRow}>
        <div className={styles.novaMark} aria-hidden="true">
          <img src="/nova/nova-character.png" alt="" />
        </div>
        <div className={styles.topCopy}>
          <span>NOVA GUIDE</span>
          <strong>{accountName}</strong>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close NOVA+ guide">
          ×
        </button>
      </div>

      <div className={styles.progress} aria-label={`Guide step ${stepIndex + 1} of ${NOVA_PLUS_GUIDE_STEPS.length}`}>
        {NOVA_PLUS_GUIDE_STEPS.map((_, index) => (
          <i key={index} className={index <= stepIndex ? styles.progressActive : ""} />
        ))}
      </div>

      <div className={styles.body}>
        <span className={styles.eyebrow}>{step.eyebrow}</span>
        <h3>{step.title}</h3>
        <p>{step.text}</p>
      </div>

      <footer className={styles.actions}>
        {!isFirst ? (
          <button type="button" className={styles.back} onClick={() => go(stepIndex - 1)}>
            ← Back
          </button>
        ) : (
          <span className={styles.firstHint}>Quick tour · about 1 minute</span>
        )}

        {isLast ? (
          <button type="button" className={styles.next} onClick={onClose}>
            Done ✓
          </button>
        ) : (
          <button type="button" className={styles.next} onClick={() => go(stepIndex + 1)}>
            Next <span>→</span>
          </button>
        )}
      </footer>
    </aside>
  );
}
