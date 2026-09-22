"use client";

import type { NormalisedTeachingEvidence } from "../TeachingTypes";
import { buildEvidenceSegments } from "./EnglishTeachingUtils";
import styles from "../CoreTeachingEngine.module.css";

export default function EnglishSentenceEvidence({
  sentence,
  evidence,
  compact = false,
}: {
  sentence: string;
  evidence: NormalisedTeachingEvidence[];
  compact?: boolean;
}) {
  if (!sentence.trim() || evidence.length === 0) return null;

  const segments = buildEvidenceSegments(sentence, evidence);
  const visibleEvidence = evidence.filter((item) =>
    segments.some((segment) => segment.evidence === item),
  );

  return (
    <div className={compact ? styles.evidenceCompact : styles.evidenceBlock}>
      <p className={styles.evidenceSentence}>
        {segments.map((segment, index) =>
          segment.evidence ? (
            <mark
              key={`${index}-${segment.text}`}
              className={styles.evidenceMark}
              title={segment.evidence.label || segment.evidence.role || undefined}
            >
              {segment.text}
            </mark>
          ) : (
            <span key={`${index}-${segment.text}`}>{segment.text}</span>
          ),
        )}
      </p>

      {visibleEvidence.length > 0 && (
        <div className={styles.evidenceLegend}>
          {visibleEvidence.map((item, index) => (
            <span key={`${item.text}-${index}`} className={styles.evidenceChip}>
              <strong>{item.text}</strong>
              {(item.label || item.role) && (
                <span>{item.label || item.role}</span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
