"use client";

import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import type { CurriculumConcept } from "@/lib/nova-plus/types";
import type { NovaTeachingSignal } from "@/lib/nova-plus/teaching-evidence";
import {
  donutSegmentPath,
  polarPoint,
  radialOffset,
  splitOrbitLabel,
} from "./MasteryOrbitGeometry";
import {
  teachingHaloClassName,
  teachingHaloKind,
} from "./MasteryTeachingSignal";
import styles from "./MasteryOrbit.module.css";

export type MasteryOrbitState =
  | "strong"
  | "developing"
  | "attention"
  | "unknown";

export type MasteryOrbitStateMeta = {
  label: string;
  colour: string;
  soft: string;
  border: string;
};

export type MasteryOrbitTopic = {
  key: string;
  domain: string;
  topic: string;
  concepts: CurriculumConcept[];
  state: MasteryOrbitState;
  strong: number;
  developing: number;
  attention: number;
  unknown: number;
  assessed: number;
};

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 760;
const CENTER_X = 500;
const CENTER_Y = 370;
const TOPIC_INNER_RADIUS = 122;
const TOPIC_OUTER_RADIUS = 235;
const TOPIC_LABEL_RADIUS = 177;
const DISTRIBUTION_INNER_RADIUS = 244;
const DISTRIBUTION_OUTER_RADIUS = 254;
const CONCEPT_RADIUS = 309;

function activateWithKeyboard(
  event: KeyboardEvent<SVGGElement>,
  action: () => void,
) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  action();
}

function averageMastery(concepts: CurriculumConcept[]) {
  const values = concepts
    .filter(
      (concept) => concept.has_evidence && concept.mastery_score !== null,
    )
    .map((concept) => Number(concept.mastery_score))
    .filter(Number.isFinite);

  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function stateDistribution(
  topic: MasteryOrbitTopic,
  conceptState: (concept: CurriculumConcept) => MasteryOrbitState,
) {
  return topic.concepts.map((concept) => ({
    concept,
    state: conceptState(concept),
  }));
}

function textAnchorForPoint(x: number) {
  if (x < CENTER_X - 26) return "end";
  if (x > CENTER_X + 26) return "start";
  return "middle";
}

export default function MasteryOrbit({
  subjectLabel,
  subjectIcon,
  primaryLevel,
  topics,
  totalConcepts,
  assessedConcepts,
  selectedTopicKey,
  selectedConcept,
  stateMeta,
  conceptState,
  hasSchoolwork,
  teachingSignalsForConcept,
  onSelectTopic,
  onSelectConcept,
  onBack,
}: {
  subjectLabel: string;
  subjectIcon: string;
  primaryLevel: number;
  topics: MasteryOrbitTopic[];
  totalConcepts: number;
  assessedConcepts: number;
  selectedTopicKey: string | null;
  selectedConcept: CurriculumConcept | null;
  stateMeta: Record<MasteryOrbitState, MasteryOrbitStateMeta>;
  conceptState: (concept: CurriculumConcept) => MasteryOrbitState;
  hasSchoolwork: (concept: CurriculumConcept) => boolean;
  teachingSignalsForConcept: (concept: CurriculumConcept) => NovaTeachingSignal[];
  onSelectTopic: (topicKey: string | null) => void;
  onSelectConcept: (concept: CurriculumConcept | null) => void;
  onBack: () => void;
}) {
  const selectedTopic =
    topics.find((topic) => topic.key === selectedTopicKey) ?? null;
  const topicCount = Math.max(topics.length, 1);
  const topicSpan = 360 / topicCount;
  const topicGap = Math.min(4.5, topicSpan * 0.13);

  const centerTitle = selectedConcept
    ? selectedConcept.skill_name
    : selectedTopic
      ? selectedTopic.topic
      : subjectLabel;

  const centerLines = splitOrbitLabel(centerTitle, selectedConcept ? 15 : 18, 3);
  const selectedTopicAverage = selectedTopic
    ? averageMastery(selectedTopic.concepts)
    : null;

  const centerValue = selectedConcept
    ? selectedConcept.has_evidence && selectedConcept.mastery_score !== null
      ? `${Math.round(selectedConcept.mastery_score)}%`
      : "—"
    : selectedTopic
      ? selectedTopicAverage === null
        ? `${selectedTopic.assessed}/${selectedTopic.concepts.length}`
        : `${selectedTopicAverage}%`
      : `${assessedConcepts}/${totalConcepts}`;

  const centerCaption = selectedConcept
    ? "mastery"
    : selectedTopic
      ? selectedTopicAverage === null
        ? "concepts assessed"
        : "average mastery"
      : "concepts assessed";

  const conceptRows = selectedTopic?.concepts ?? [];
  const conceptStep = conceptRows.length > 0 ? 360 / conceptRows.length : 0;
  const selectedTopicIndex = selectedTopic
    ? Math.max(0, topics.findIndex((topic) => topic.key === selectedTopic.key))
    : 0;
  const conceptStartAngle = selectedTopic
    ? selectedTopicIndex * topicSpan + topicSpan / 2
    : 0;

  return (
    <section className={styles.shell}>
      <div className={styles.orbitTopline}>
        <div>
          <span>INTERACTIVE MASTERY ORBIT</span>
          <strong>
            {selectedTopic
              ? `Exploring ${selectedTopic.topic}`
              : "Select a topic to reveal its concepts"}
          </strong>
        </div>
        <div className={styles.visualKey}>
          <span><i className={styles.keyMastery} /> Inner colour = mastery</span>
          <span><i className={styles.keyTeaching} /> Halo = teaching response</span>
        </div>
      </div>

      <div className={styles.canvas}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          role="img"
          aria-label={`${subjectLabel} Primary ${primaryLevel} mastery orbit`}
        >
          <defs>
            <radialGradient id="mastery-orbit-core" cx="50%" cy="42%" r="68%">
              <stop offset="0%" stopColor="rgba(83,215,255,.16)" />
              <stop offset="62%" stopColor="rgba(124,58,237,.09)" />
              <stop offset="100%" stopColor="rgba(2,9,21,.94)" />
            </radialGradient>
            <filter id="mastery-orbit-soft-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r="286"
            className={styles.guideRing}
          />
          <circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r="257"
            className={styles.guideRingInner}
          />

          {topics.map((topic, index) => {
            const startAngle = index * topicSpan + topicGap / 2;
            const endAngle = (index + 1) * topicSpan - topicGap / 2;
            const midAngle = (startAngle + endAngle) / 2;
            const meta = stateMeta[topic.state];
            const selected = selectedTopic?.key === topic.key;
            const dimmed = Boolean(selectedTopic && !selected);
            const offset = selected ? radialOffset(midAngle, 12) : { x: 0, y: 0 };
            const labelPoint = polarPoint(
              CENTER_X,
              CENTER_Y,
              TOPIC_LABEL_RADIUS + (selected ? 7 : 0),
              midAngle,
            );
            const lines = splitOrbitLabel(topic.topic, 16, 2);
            const distribution = stateDistribution(topic, conceptState);
            const segmentSpan = (endAngle - startAngle) / Math.max(distribution.length, 1);

            return (
              <g
                key={topic.key}
                className={`${styles.topicGroup} ${selected ? styles.topicSelected : ""} ${
                  dimmed ? styles.topicDimmed : ""
                }`}
                transform={`translate(${offset.x} ${offset.y})`}
                role="button"
                tabIndex={0}
                aria-label={`${topic.topic}, ${meta.label}, ${topic.assessed} of ${topic.concepts.length} concepts assessed`}
                onClick={() => onSelectTopic(selected ? null : topic.key)}
                onKeyDown={(event: KeyboardEvent<SVGGElement>) =>
                  activateWithKeyboard(event, () =>
                    onSelectTopic(selected ? null : topic.key),
                  )
                }
              >
                <path
                  d={donutSegmentPath(
                    CENTER_X,
                    CENTER_Y,
                    selected ? TOPIC_INNER_RADIUS - 5 : TOPIC_INNER_RADIUS,
                    selected ? TOPIC_OUTER_RADIUS + 10 : TOPIC_OUTER_RADIUS,
                    startAngle,
                    endAngle,
                  )}
                  className={styles.topicSector}
                  style={{ fill: meta.soft, stroke: meta.colour }}
                />

                {distribution.map((entry, conceptIndex) => {
                  const entryMeta = stateMeta[entry.state];
                  const segmentStart = startAngle + conceptIndex * segmentSpan + 0.35;
                  const segmentEnd = startAngle + (conceptIndex + 1) * segmentSpan - 0.35;
                  if (segmentEnd <= segmentStart) return null;
                  return (
                    <path
                      key={entry.concept.skill_id}
                      d={donutSegmentPath(
                        CENTER_X,
                        CENTER_Y,
                        selected ? DISTRIBUTION_INNER_RADIUS + 10 : DISTRIBUTION_INNER_RADIUS,
                        selected ? DISTRIBUTION_OUTER_RADIUS + 10 : DISTRIBUTION_OUTER_RADIUS,
                        segmentStart,
                        segmentEnd,
                      )}
                      className={styles.distributionSegment}
                      style={{ fill: entryMeta.colour }}
                    />
                  );
                })}

                <text
                  x={labelPoint.x}
                  y={labelPoint.y - (lines.length - 1) * 8}
                  textAnchor="middle"
                  className={styles.topicLabel}
                  style={{ fill: selected ? "#ffffff" : "rgba(240,249,255,.78)" }}
                >
                  {lines.map((line, lineIndex) => (
                    <tspan
                      key={`${topic.key}-${lineIndex}`}
                      x={labelPoint.x}
                      dy={lineIndex === 0 ? 0 : 16}
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
                <text
                  x={labelPoint.x}
                  y={labelPoint.y + 30}
                  textAnchor="middle"
                  className={styles.topicCount}
                  style={{ fill: meta.colour }}
                >
                  {topic.assessed}/{topic.concepts.length}
                </text>
              </g>
            );
          })}

          {selectedTopic &&
            conceptRows.map((concept, index) => {
              const angle = conceptStartAngle + index * conceptStep;
              const point = polarPoint(CENTER_X, CENTER_Y, CONCEPT_RADIUS, angle);
              const labelPoint = polarPoint(CENTER_X, CENTER_Y, CONCEPT_RADIUS + 34, angle);
              const state = conceptState(concept);
              const meta = stateMeta[state];
              const selected = selectedConcept?.skill_id === concept.skill_id;
              const teachingSignals = teachingSignalsForConcept(concept);
              const haloKind = teachingHaloKind(teachingSignals[0]);
              const haloClass = teachingHaloClassName(haloKind, styles);
              const lines = splitOrbitLabel(concept.skill_name, 15, 2);
              const anchor = textAnchorForPoint(labelPoint.x);
              const nudgeX = anchor === "start" ? 9 : anchor === "end" ? -9 : 0;
              const nudgeY = labelPoint.y < CENTER_Y ? -5 : 12;

              return (
                <g
                  key={concept.skill_id}
                  className={`${styles.conceptGroup} ${selected ? styles.conceptSelected : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${concept.skill_name}, ${meta.label}`}
                  onClick={(event: MouseEvent<SVGGElement>) => {
                    event.stopPropagation();
                    onSelectConcept(selected ? null : concept);
                  }}
                  onKeyDown={(event: KeyboardEvent<SVGGElement>) =>
                    activateWithKeyboard(event, () =>
                      onSelectConcept(selected ? null : concept),
                    )
                  }
                  style={{ "--concept-delay": `${index * 34}ms` } as CSSProperties}
                >
                  {haloKind && (
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={selected ? 22 : 18}
                      className={`${styles.conceptHalo} ${haloClass}`}
                    />
                  )}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={selected ? 14 : 10}
                    className={styles.conceptDot}
                    style={{ fill: meta.colour, stroke: selected ? "#ffffff" : meta.colour }}
                  />
                  {hasSchoolwork(concept) && (
                    <circle
                      cx={point.x + (selected ? 14 : 11)}
                      cy={point.y - (selected ? 14 : 11)}
                      r="4.5"
                      className={styles.schoolworkSatellite}
                    />
                  )}
                  <text
                    x={labelPoint.x + nudgeX}
                    y={labelPoint.y + nudgeY}
                    textAnchor={anchor}
                    className={styles.conceptLabel}
                  >
                    {lines.map((line, lineIndex) => (
                      <tspan
                        key={`${concept.skill_id}-label-${lineIndex}`}
                        x={labelPoint.x + nudgeX}
                        dy={lineIndex === 0 ? 0 : 14}
                      >
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}

          <g
            className={`${styles.centerGroup} ${selectedTopic || selectedConcept ? styles.centerInteractive : ""}`}
            role={selectedTopic || selectedConcept ? "button" : undefined}
            tabIndex={selectedTopic || selectedConcept ? 0 : -1}
            aria-label={
              selectedTopic || selectedConcept
                ? "Go back one level in the mastery orbit"
                : `${subjectLabel} Primary ${primaryLevel} overview`
            }
            onClick={() => {
              if (selectedTopic || selectedConcept) onBack();
            }}
            onKeyDown={(event: KeyboardEvent<SVGGElement>) => {
              if (selectedTopic || selectedConcept) {
                activateWithKeyboard(event, onBack);
              }
            }}
          >
            <circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r="105"
              className={styles.centerGlow}
              filter="url(#mastery-orbit-soft-glow)"
            />
            <circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r="96"
              className={styles.centerOrb}
              fill="url(#mastery-orbit-core)"
            />
            <text x={CENTER_X} y={CENTER_Y - 57} textAnchor="middle" className={styles.centerEyebrow}>
              {selectedConcept ? "CONCEPT" : selectedTopic ? "TOPIC" : `${subjectIcon} PRIMARY ${primaryLevel}`}
            </text>
            <text
              x={CENTER_X}
              y={CENTER_Y - 27 - (centerLines.length - 1) * 9}
              textAnchor="middle"
              className={styles.centerTitle}
            >
              {centerLines.map((line, index) => (
                <tspan key={`center-${index}`} x={CENTER_X} dy={index === 0 ? 0 : 18}>
                  {line}
                </tspan>
              ))}
            </text>
            <text x={CENTER_X} y={CENTER_Y + 39} textAnchor="middle" className={styles.centerValue}>
              {centerValue}
            </text>
            <text x={CENTER_X} y={CENTER_Y + 57} textAnchor="middle" className={styles.centerCaption}>
              {centerCaption}
            </text>
            {(selectedTopic || selectedConcept) && (
              <text x={CENTER_X} y={CENTER_Y + 78} textAnchor="middle" className={styles.centerBack}>
                ← Back
              </text>
            )}
          </g>
        </svg>
      </div>

      <div className={styles.bottomKey}>
        <span><i className={styles.dotStrong} /> Strong</span>
        <span><i className={styles.dotDeveloping} /> Developing</span>
        <span><i className={styles.dotAttention} /> Needs attention</span>
        <span><i className={styles.dotUnknown} /> Not assessed</span>
        <span className={styles.keySeparator} />
        <span><i className={styles.haloKeyRecovery} /> Responding to support</span>
        <span><i className={styles.haloKeyNeeds} /> Needs more practice</span>
        <span><i className={styles.schoolworkKey} /> Uploaded work</span>
      </div>
    </section>
  );
}
