"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import { useNovaSchoolworkEvidence } from "@/hooks/useNovaSchoolworkEvidence";
import { useNovaTeachingEvidence } from "@/hooks/useNovaTeachingEvidence";
import type {
  NovaRecommendation,
  NovaRecommendationLane,
  NovaRecommendationsPayload,
} from "@/lib/nova-plus/types";
import type {
  NovaLearningCycle,
  NovaLearningCyclesPayload,
} from "@/lib/nova-plus/phase6-types";
import {
  humaniseMisconceptionCode,
  teachingConceptMapKey,
  teachingEvidenceExplanation,
  teachingEvidenceHeadline,
  teachingRecoveryExplanation,
  type NovaTeachingSignal,
} from "@/lib/nova-plus/teaching-evidence";
import styles from "./NovaRecommendsTab.module.css";

type NovaRecommendsTabProps = {
  learnerId: string;
  learnerLabel: string;
  canLaunchPractice: boolean;
  isAdminPreview?: boolean;
};

type LaneMeta = {
  eyebrow: string;
  sectionTitle: string;
  sectionDescription: string;
  cardLabel: string;
  actionLabel: string;
  icon: string;
};

const LANE_META: Record<
  NovaRecommendationLane,
  LaneMeta
> = {
  focus_now: {
    eyebrow: "TOP PRIORITY",
    sectionTitle: "Focus Now",
    sectionDescription:
      "The clearest evidence-backed concept to work on next.",
    cardLabel: "Priority Now",
    actionLabel: "Start Practice",
    icon: "01",
  },
  build_next: {
    eyebrow: "UP NEXT",
    sectionTitle: "Next Best Moves",
    sectionDescription:
      "Concepts that are building and worth strengthening soon.",
    cardLabel: "Build Next",
    actionLabel: "Start Practice",
    icon: "02",
  },
  reassess: {
    eyebrow: "CHECK AGAIN",
    sectionTitle: "Reassess",
    sectionDescription:
      "A concept that should be checked again instead of repeated blindly.",
    cardLabel: "Ready to Reassess",
    actionLabel: "Reassess Now",
    icon: "03",
  },
  stretch: {
    eyebrow: "READY TO STRETCH",
    sectionTitle: "Stretch Further",
    sectionDescription:
      "A secure concept that can handle a stronger challenge.",
    cardLabel: "Stretch",
    actionLabel: "Start Challenge",
    icon: "04",
  },
};

const SUBJECT_LABELS: Record<
  "english" | "math",
  string
> = {
  english: "English",
  math: "Mathematics",
};

function numberValue(
  value: number | null | undefined,
  fallback = 0,
) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function percentage(
  value: number | null | undefined,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  return `${Math.round(
    numberValue(value),
  )}%`;
}

function trendLabel(
  item: NovaRecommendation,
) {
  const points =
    numberValue(item.trend_points);

  if (item.trend === "improving") {
    return points
      ? `Improving +${Math.round(points)} pts`
      : "Improving";
  }

  if (item.trend === "declining") {
    return points
      ? `Declining ${Math.round(points)} pts`
      : "Declining";
  }

  if (item.trend === "stable") {
    return "Stable";
  }

  return "Not enough trend data";
}

function dateLabel(
  value: string | null,
) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat(
    "en-SG",
    {
      day: "numeric",
      month: "short",
    },
  ).format(date);
}

function laneClass(
  lane: NovaRecommendationLane,
) {
  switch (lane) {
    case "focus_now":
      return styles.focusCard;
    case "build_next":
      return styles.buildCard;
    case "reassess":
      return styles.reassessCard;
    case "stretch":
      return styles.stretchCard;
  }
}

function teachingToneClass(
  signal: NovaTeachingSignal,
) {
  if (
    signal.recovery_state ===
    "needs_reinforcement"
  ) {
    return styles.teachingNeedsPractice;
  }

  if (
    signal.recovery_state ===
    "recovery_signal"
  ) {
    return styles.teachingRecovering;
  }

  if (
    signal.recovery_state ===
    "mixed_transfer"
  ) {
    return styles.teachingMixed;
  }

  if (
    signal.evidence_level ===
    "likely_gap"
  ) {
    return styles.teachingRepeated;
  }

  if (
    signal.evidence_level ===
    "emerging_pattern"
  ) {
    return styles.teachingEmerging;
  }

  return styles.teachingObserved;
}

function teachingSignalsForRecommendation(
  item: NovaRecommendation,
  byConceptKey: Map<
    string,
    NovaTeachingSignal[]
  >,
) {
  const key = teachingConceptMapKey(
    item.subject,
    item.skill_code,
  );

  return key
    ? byConceptKey.get(key) ?? []
    : [];
}

function RecommendationCard({
  item,
  learnerLabel,
  canLaunchPractice,
  isAdminPreview,
  featured = false,
  schoolworkCount = 0,
  teachingSignals = [],
  starting = false,
  onStartLearningCycle,
}: {
  item: NovaRecommendation;
  learnerLabel: string;
  canLaunchPractice: boolean;
  isAdminPreview: boolean;
  featured?: boolean;
  schoolworkCount?: number;
  teachingSignals?: NovaTeachingSignal[];
  starting?: boolean;
  onStartLearningCycle?: (
    item: NovaRecommendation,
  ) => Promise<void>;
}) {
  const meta = LANE_META[item.lane];

  const quizHref =
    item.quiz?.quiz_href || "";

  const mayOpen =
    Boolean(quizHref) &&
    (canLaunchPractice || isAdminPreview);

  const shouldStartCycle =
    item.lane === "focus_now" &&
    canLaunchPractice &&
    Boolean(onStartLearningCycle);

  const primaryTeachingSignal =
    teachingSignals[0] ?? null;

  return (
    <article
      className={`${styles.recommendationCard} ${laneClass(
        item.lane,
      )} ${
        featured
          ? styles.featuredCard
          : ""
      }`}
    >
      <div className={styles.cardTop}>
        <div className={styles.cardPriority}>
          <span
            className={styles.laneNumber}
          >
            {meta.icon}
          </span>

          <div>
            <small>{meta.eyebrow}</small>
            <strong>
              {meta.cardLabel}
            </strong>
          </div>
        </div>

        <div className={styles.cardBadges}>
          {schoolworkCount > 0 && (
            <span
              className={
                styles.schoolworkBadge
              }
            >
              Work evidence ·{" "}
              {schoolworkCount}
            </span>
          )}

          <div
            className={
              styles.subjectBadge
            }
          >
            {SUBJECT_LABELS[item.subject]} ·
            P{item.primary_level}
          </div>
        </div>
      </div>

      <div className={styles.conceptCopy}>
        <span>{item.topic}</span>

        <h3>{item.skill_name}</h3>

        {item.public_explanation && (
          <p>
            {item.public_explanation}
          </p>
        )}
      </div>

      <div className={styles.novaReason}>
        <div className={styles.reasonMark}>
          N+
        </div>

        <p>{item.reason}</p>
      </div>

      {primaryTeachingSignal && (
        <div
          className={`${styles.teachingInsight} ${teachingToneClass(
            primaryTeachingSignal,
          )}`}
        >
          <div
            className={
              styles.teachingInsightMark
            }
          >
            ✦
          </div>

          <div
            className={
              styles.teachingInsightCopy
            }
          >
            <span>
              TEACHING RESPONSE
            </span>

            <strong>
              {teachingEvidenceHeadline(
                primaryTeachingSignal,
              )}
            </strong>

            <p>
              {humaniseMisconceptionCode(
                primaryTeachingSignal
                  .misconception_code,
              )}
              {" · "}
              {primaryTeachingSignal
                .distinct_questions}{" "}
              different question
              {primaryTeachingSignal
                .distinct_questions === 1
                ? ""
                : "s"}
            </p>

            {primaryTeachingSignal
              .quick_check_attempts > 0 && (
              <small>
                Transfer check:{" "}
                {
                  primaryTeachingSignal
                    .quick_check_correct_count
                }
                /
                {
                  primaryTeachingSignal
                    .quick_check_attempts
                }{" "}
                correct
              </small>
            )}
          </div>
        </div>
      )}

      <div
        className={
          styles.recommendedMission
        }
      >
        <div>
          <small>
            RECOMMENDED MISSION
          </small>

          <strong>
            {item.quiz.quiz_title}
          </strong>

          <span>
            {item.quiz.quiz_type ||
              "Practice"}

            {item.quiz
              .quiz_skill_coverage_percentage !==
            null
              ? ` · ${Math.round(
                  numberValue(
                    item.quiz
                      .quiz_skill_coverage_percentage,
                  ),
                )}% concept coverage`
              : ""}
          </span>
        </div>

        {mayOpen ? (
          shouldStartCycle ? (
            <button
              type="button"
              className={styles.startButton}
              disabled={starting}
              onClick={() =>
                void onStartLearningCycle?.(
                  item,
                )
              }
            >
              {starting
                ? "Starting…"
                : meta.actionLabel}
              <span>→</span>
            </button>
          ) : (
            <a
              className={styles.startButton}
              href={quizHref}
            >
              {isAdminPreview &&
              !canLaunchPractice
                ? "Open Mission"
                : meta.actionLabel}
              <span>→</span>
            </a>
          )
        ) : (
          <div
            className={
              styles.viewerNotice
            }
          >
            <strong>
              Open from {learnerLabel}&apos;s
              account
            </strong>

            <span>
              This keeps the practice
              attempt recorded under
              {learnerLabel}, not the viewer.
            </span>
          </div>
        )}
      </div>

      <details
        className={styles.whyPanel}
      >
        <summary>
          <span>Why this?</span>
          <b>View Evidence</b>
        </summary>

        <div
          className={styles.evidenceGrid}
        >
          <div>
            <small>
              Questions analysed
            </small>
            <strong>
              {item.questions_analyzed}
            </strong>
          </div>

          <div>
            <small>
              Separate attempts
            </small>
            <strong>
              {item.separate_attempts}
            </strong>
          </div>

          <div>
            <small>
              Recent errors
            </small>
            <strong>
              {item.recent_errors}
            </strong>
          </div>

          <div>
            <small>Mastery</small>
            <strong>
              {percentage(
                item.mastery_score,
              )}
            </strong>
          </div>

          <div>
            <small>Confidence</small>
            <strong>
              {percentage(
                item.confidence_score,
              )}
            </strong>
          </div>

          <div>
            <small>Trend</small>
            <strong>
              {trendLabel(item)}
            </strong>
          </div>

          <div>
            <small>
              Last practised
            </small>
            <strong>
              {dateLabel(
                item.last_practised_at,
              )}
            </strong>
          </div>

          <div>
            <small>
              Quiz coverage
            </small>
            <strong>
              {percentage(
                item.quiz
                  .quiz_skill_coverage_percentage,
              )}
            </strong>
          </div>

          <div>
            <small>
              Uploaded work
            </small>
            <strong>
              {schoolworkCount > 0
                ? `${schoolworkCount} approved item${
                    schoolworkCount === 1
                      ? ""
                      : "s"
                  }`
                : "None"}
            </strong>
          </div>
        </div>

        {teachingSignals.length > 0 && (
          <section
            className={
              styles.teachingEvidencePanel
            }
          >
            <div
              className={
                styles.teachingEvidenceHeading
              }
            >
              <div>
                <span>
                  TEACHING EVIDENCE
                </span>
                <strong>
                  How {learnerLabel} responded
                  to support
                </strong>
              </div>

              <small>
                Supporting context
              </small>
            </div>

            <div
              className={
                styles.teachingEvidenceList
              }
            >
              {teachingSignals
                .slice(0, 2)
                .map((signal) => (
                  <div
                    key={
                      signal.evidence_group_key
                    }
                    className={`${styles.teachingEvidenceItem} ${teachingToneClass(
                      signal,
                    )}`}
                  >
                    <div
                      className={
                        styles.teachingEvidenceItemTop
                      }
                    >
                      <strong>
                        {teachingEvidenceHeadline(
                          signal,
                        )}
                      </strong>

                      <span>
                        {
                          signal.distinct_questions
                        }{" "}
                        question
                        {signal
                          .distinct_questions ===
                        1
                          ? ""
                          : "s"}
                      </span>
                    </div>

                    <p>
                      {humaniseMisconceptionCode(
                        signal.misconception_code,
                      )}
                    </p>

                    <small>
                      {teachingEvidenceExplanation(
                        signal,
                      )}
                    </small>

                    <small>
                      {teachingRecoveryExplanation(
                        signal,
                        learnerLabel,
                      )}
                    </small>

                    <div
                      className={
                        styles.teachingEvidenceMetrics
                      }
                    >
                      <span>
                        <b>
                          {
                            signal.hint_used_occurrences
                          }
                        </b>
                        Hints
                      </span>

                      <span>
                        <b>
                          {
                            signal.teaching_opened_occurrences
                          }
                        </b>
                        Teaching opens
                      </span>

                      <span>
                        <b>
                          {signal
                            .quick_check_attempts >
                          0
                            ? `${signal.quick_check_correct_count}/${signal.quick_check_attempts}`
                            : "—"}
                        </b>
                        Quick Checks
                      </span>
                    </div>
                  </div>
                ))}
            </div>

            {teachingSignals.length > 2 && (
              <small
                className={
                  styles.teachingMoreNote
                }
              >
                +{teachingSignals.length - 2}{" "}
                additional teaching signal
                {teachingSignals.length - 2 === 1
                  ? ""
                  : "s"}{" "}
                recorded for this concept.
              </small>
            )}

            <small
              className={
                styles.teachingRankingNote
              }
            >
              Teaching evidence is shown as
              supporting context in this
              phase. It does not yet change
              recommendation ranking or lane.
            </small>
          </section>
        )}

        {item.evidence_quality !==
          "ready" && (
          <p
            className={
              styles.evidenceNote
            }
          >
            Nova is still gathering
            evidence here, so this is not
            being treated as a confirmed
            gap yet.
          </p>
        )}

        {item.alternatives?.length >
          0 && (
          <div
            className={
              styles.alternatives
            }
          >
            <small>
              OTHER SUITABLE MISSIONS
            </small>

            <div>
              {item.alternatives.map(
                (alternative) =>
                  alternative.quiz_href &&
                  (canLaunchPractice ||
                    isAdminPreview) ? (
                    <a
                      href={
                        alternative.quiz_href
                      }
                      key={
                        alternative.quiz_id
                      }
                    >
                      <span>
                        {
                          alternative.quiz_title
                        }
                      </span>

                      <b>
                        {alternative.quiz_skill_coverage_percentage !==
                        null
                          ? `${Math.round(
                              numberValue(
                                alternative.quiz_skill_coverage_percentage,
                              ),
                            )}%`
                          : "Open"}
                      </b>
                    </a>
                  ) : (
                    <div
                      key={
                        alternative.quiz_id
                      }
                    >
                      <span>
                        {
                          alternative.quiz_title
                        }
                      </span>

                      <b>
                        {alternative.quiz_skill_coverage_percentage !==
                        null
                          ? `${Math.round(
                              numberValue(
                                alternative.quiz_skill_coverage_percentage,
                              ),
                            )}%`
                          : "Mapped"}
                      </b>
                    </div>
                  ),
              )}
            </div>
          </div>
        )}
      </details>
    </article>
  );
}

function CycleCard({
  cycle,
  learnerLabel,
  canLaunchPractice,
}: {
  cycle: NovaLearningCycle;
  learnerLabel: string;
  canLaunchPractice: boolean;
}) {
  const ready =
    cycle.status === "ready_to_check";

  const questionProgress =
    Math.min(
      100,
      (numberValue(
        cycle.practice_questions,
      ) /
        Math.max(
          1,
          numberValue(
            cycle.required_questions,
            5,
          ),
        )) *
        100,
    );

  const activityProgress =
    Math.min(
      100,
      (numberValue(
        cycle.practice_activities,
      ) /
        Math.max(
          1,
          numberValue(
            cycle.required_activities,
            2,
          ),
        )) *
        100,
    );

  const accuracyReady =
    cycle.practice_accuracy !== null &&
    numberValue(
      cycle.practice_accuracy,
    ) >=
      numberValue(
        cycle.required_accuracy,
        70,
      );

  return (
    <article
      className={`${styles.cycleCard} ${
        ready
          ? styles.cycleCardReady
          : ""
      }`}
    >
      <div className={styles.cycleTop}>
        <div>
          <span
            className={styles.cycleEyebrow}
          >
            {ready
              ? "READY TO CHECK AGAIN"
              : "LEARNING LOOP ACTIVE"}
          </span>

          <h3>{cycle.skill_name}</h3>

          <p>
            {SUBJECT_LABELS[
              cycle.subject
            ]}{" "}
            · P{cycle.primary_level}
            {cycle.topic
              ? ` · ${cycle.topic}`
              : ""}
          </p>
        </div>

        <span
          className={
            ready
              ? styles.readyPill
              : styles.activePill
          }
        >
          {ready
            ? "Ready"
            : "Practising"}
        </span>
      </div>

      {cycle.gap_reason && (
        <div className={styles.cycleReason}>
          <span>N+</span>
          <p>{cycle.gap_reason}</p>
        </div>
      )}

      {!ready ? (
        <>
          <div
            className={styles.cycleMetrics}
          >
            <div>
              <small>
                New questions
              </small>
              <strong>
                {cycle.practice_questions}/
                {
                  cycle.required_questions
                }
              </strong>
              <i>
                <b
                  style={{
                    width: `${questionProgress}%`,
                  }}
                />
              </i>
            </div>

            <div>
              <small>
                Learning activities
              </small>
              <strong>
                {
                  cycle.practice_activities
                }
                /
                {
                  cycle.required_activities
                }
              </strong>
              <i>
                <b
                  style={{
                    width: `${activityProgress}%`,
                  }}
                />
              </i>
            </div>

            <div>
              <small>
                Practice accuracy
              </small>
              <strong>
                {cycle.practice_accuracy ===
                null
                  ? "—"
                  : `${Math.round(
                      numberValue(
                        cycle.practice_accuracy,
                      ),
                    )}%`}
              </strong>
              <span
                className={
                  accuracyReady
                    ? styles.metricReady
                    : styles.metricWaiting
                }
              >
                Need{" "}
                {Math.round(
                  numberValue(
                    cycle.required_accuracy,
                    70,
                  ),
                )}
                %+
              </span>
            </div>
          </div>

          {cycle.last_check_outcome && (
            <div
              className={
                styles.previousCheck
              }
            >
              <span>
                Last Nova Check
              </span>

              <strong>
                {Math.round(
                  numberValue(
                    cycle.last_check_percentage,
                  ),
                )}
                %
              </strong>

              <p>
                {cycle.last_check_outcome ===
                "improving"
                  ? "Improving — build a little more evidence before the next check."
                  : "Still needs support — Nova has reopened the practice loop."}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className={styles.readyMessage}>
          <div
            className={styles.readyMark}
          >
            ✓
          </div>

          <div>
            <strong>
              Enough new evidence has
              accumulated.
            </strong>
            <p>
              Nova will use 5 fresh,
              validated questions mapped
              to this exact concept. The
              check itself does not award
              DT or DG.
            </p>
          </div>
        </div>
      )}

      <div className={styles.cycleAction}>
        {canLaunchPractice ? (
          ready &&
          cycle.nova_check_href ? (
            <a
              href={
                cycle.nova_check_href
              }
              className={
                styles.startButton
              }
            >
              Start Nova Check
              <span>→</span>
            </a>
          ) : cycle.recommended_quiz_href ? (
            <a
              href={
                cycle.recommended_quiz_href
              }
              className={
                styles.startButton
              }
            >
              Continue Practice
              <span>→</span>
            </a>
          ) : (
            <div
              className={
                styles.viewerNotice
              }
            >
              <strong>
                Practice mission unavailable
              </strong>
              <span>
                Nova is waiting for another
                mapped mission to become
                available.
              </span>
            </div>
          )
        ) : (
          <div
            className={
              styles.viewerNotice
            }
          >
            <strong>
              Action required from {learnerLabel}
            </strong>
            <span>
              Practice and Nova Check must
              be completed from the
              {learnerLabel}&apos;s own account.
            </span>
          </div>
        )}

        <small>
          {cycle.available_check_questions >=
          5
            ? `${cycle.available_check_questions} validated check questions available`
            : `${cycle.available_check_questions}/5 validated check questions currently available`}
        </small>
      </div>
    </article>
  );
}

export default function NovaRecommendsTab({
  learnerId,
  learnerLabel,
  canLaunchPractice,
  isAdminPreview = false,
}: NovaRecommendsTabProps) {
  const [
    payload,
    setPayload,
  ] =
    useState<NovaRecommendationsPayload | null>(
      null,
    );

  const [
    cyclePayload,
    setCyclePayload,
  ] =
    useState<NovaLearningCyclesPayload | null>(
      null,
    );

  const schoolworkEvidence =
    useNovaSchoolworkEvidence(learnerId);

  const teachingEvidence =
    useNovaTeachingEvidence(learnerId);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    cycleWarning,
    setCycleWarning,
  ] = useState("");

  const [
    startingSkillId,
    setStartingSkillId,
  ] = useState<string | null>(null);

  const load = useCallback(
    async () => {
      setLoading(true);
      setError("");
      setCycleWarning("");

      const [
        recommendationsResult,
        cyclesResult,
      ] = await Promise.all([
        supabase.rpc(
          "get_nova_plus_recommendations",
          {
            p_student_user_id:
              learnerId,
          },
        ),

        supabase.rpc(
          "get_nova_learning_cycles",
          {
            p_student_user_id:
              learnerId,
          },
        ),
      ]);

      if (
        recommendationsResult.error
      ) {
        setPayload(null);
        setError(
          recommendationsResult.error
            .message,
        );
        setLoading(false);
        return;
      }

      setPayload(
        (recommendationsResult.data ??
          null) as NovaRecommendationsPayload | null,
      );

      if (cyclesResult.error) {
        setCyclePayload(null);
        setCycleWarning(
          cyclesResult.error.message,
        );
      } else {
        setCyclePayload(
          (cyclesResult.data ??
            null) as NovaLearningCyclesPayload | null,
        );
      }

      setLoading(false);
    },
    [learnerId],
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (cancelled) return;
      await load();
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [load]);

  async function startLearningCycle(
    item: NovaRecommendation,
  ) {
    const quizHref =
      item.quiz?.quiz_href || "";

    if (
      !canLaunchPractice ||
      !quizHref
    ) {
      return;
    }

    setStartingSkillId(
      String(item.skill_id),
    );
    setError("");

    const { error: startError } =
      await supabase.rpc(
        "start_nova_learning_cycle",
        {
          p_student_user_id:
            learnerId,
          p_skill_id: item.skill_id,
        },
      );

    if (startError) {
      setStartingSkillId(null);
      setError(startError.message);
      return;
    }

    window.location.assign(quizHref);
  }

  const openCycles =
    cyclePayload?.open_cycles ?? [];

  const cycleSkillIds = useMemo(
    () =>
      new Set(
        openCycles.map((cycle) =>
          String(cycle.skill_id),
        ),
      ),
    [openCycles],
  );

  const recommendations =
    useMemo(
      () =>
        (
          payload?.recommendations ?? []
        ).filter(
          (item) =>
            !cycleSkillIds.has(
              String(item.skill_id),
            ),
        ),
      [
        payload?.recommendations,
        cycleSkillIds,
      ],
    );

  const grouped = useMemo(() => {
    const groups: Record<
      NovaRecommendationLane,
      NovaRecommendation[]
    > = {
      focus_now: [],
      build_next: [],
      reassess: [],
      stretch: [],
    };

    for (const item of recommendations) {
      if (groups[item.lane]) {
        groups[item.lane].push(item);
      }
    }

    return groups;
  }, [recommendations]);

  const focus =
    grouped.focus_now[0] ?? null;

  const build =
    grouped.build_next.slice(0, 2);

  const finish =
    grouped.reassess[0] ??
    grouped.stretch[0] ??
    null;

  const hasAnything =
    openCycles.length > 0 ||
    recommendations.length > 0;

  return (
    <section className={styles.page}>
      <header className={styles.introCard}>
        <div>
          <span
            className={styles.eyebrow}
          >
            NOVA RECOMMENDS
          </span>

          <h2>
            Know exactly what to work
            on next
          </h2>

          <p>
            Nova turns{" "}
            {learnerLabel}&apos;s
            latest concept evidence
            into a small number of
            clear next steps — then
            checks whether the support
            actually worked.
          </p>
        </div>

        <div
          className={
            styles.intelligenceKey
          }
        >
          <span>
            <i
              className={
                styles.focusDot
              }
            />
            Confirmed priority
          </span>

          <span>
            <i
              className={
                styles.buildDot
              }
            />
            Building up
          </span>

          <span>
            <i
              className={
                styles.reassessDot
              }
            />
            Check again
          </span>

          <span>
            <i
              className={
                styles.stretchDot
              }
            />
            Stretch further
          </span>
        </div>
      </header>

      {loading ? (
        <div className={styles.stateCard}>
          <span
            className={styles.loader}
          />
          <strong>
            Nova is ranking the next
            best actions…
          </strong>
          <p>
            Using current mastery,
            evidence confidence, recent
            errors, learning-cycle
            progress and available
            mapped missions.
          </p>
        </div>
      ) : error ? (
        <div className={styles.stateCard}>
          <span
            className={
              styles.stateMark
            }
          >
            N+
          </span>
          <strong>
            Recommendations could not
            be loaded.
          </strong>
          <p>{error}</p>

          <button
            type="button"
            className={
              styles.retryButton
            }
            onClick={() => void load()}
          >
            Try Again
          </button>
        </div>
      ) : !hasAnything ? (
        <div
          className={
            styles.emptyState
          }
        >
          <div
            className={styles.emptyOrb}
          >
            N+
          </div>

          <div>
            <span
              className={
                styles.eyebrow
              }
            >
              BUILDING THE PICTURE
            </span>

            <h3>
              No priority needs to be
              forced yet.
            </h3>

            <p>
              Nova needs more mapped
              English or Mathematics
              evidence before it can
              make a confident
              recommendation.
            </p>
          </div>
        </div>
      ) : (
        <>
          {cycleWarning && (
            <div
              className={
                styles.cycleWarning
              }
            >
              Recommendation ranking
              loaded, but learning-cycle
              progress could not be
              refreshed: {cycleWarning}
            </div>
          )}

          {teachingEvidence.error && (
            <div
              className={
                styles.teachingWarning
              }
            >
              Recommendations are still
              available, but recent Teaching
              Engine evidence could not be
              loaded: {teachingEvidence.error}
            </div>
          )}

          {openCycles.length > 0 && (
            <section
              className={
                styles.cycleSection
              }
            >
              <div
                className={
                  styles.sectionHeading
                }
              >
                <div>
                  <span>
                    LEARNING LOOP
                  </span>

                  <h3>
                    From gap to proof
                  </h3>

                  <p>
                    Nova is tracking new
                    evidence after
                    targeted practice,
                    not simply asking
                    {learnerLabel} to repeat
                    quizzes forever.
                  </p>
                </div>

                <b>
                  {openCycles.length}{" "}
                  {openCycles.length ===
                  1
                    ? "active cycle"
                    : "active cycles"}
                </b>
              </div>

              <div
                className={
                  styles.cycleList
                }
              >
                {openCycles.map(
                  (cycle) => (
                    <CycleCard
                      key={cycle.id}
                      cycle={cycle}
                      learnerLabel={learnerLabel}
                      canLaunchPractice={
                        canLaunchPractice
                      }
                    />
                  ),
                )}
              </div>
            </section>
          )}

          {focus && (
            <section
              className={
                styles.focusSection
              }
            >
              <div
                className={
                  styles.sectionHeading
                }
              >
                <div>
                  <span>
                    {
                      LANE_META
                        .focus_now
                        .eyebrow
                    }
                  </span>
                  <h3>
                    {
                      LANE_META
                        .focus_now
                        .sectionTitle
                    }
                  </h3>
                  <p>
                    {
                      LANE_META
                        .focus_now
                        .sectionDescription
                    }
                  </p>
                </div>

                <b>1 concept</b>
              </div>

              <RecommendationCard
                item={focus}
                learnerLabel={learnerLabel}
                canLaunchPractice={
                  canLaunchPractice
                }
                isAdminPreview={
                  isAdminPreview
                }
                featured
                starting={
                  startingSkillId ===
                  String(
                    focus.skill_id,
                  )
                }
                onStartLearningCycle={
                  startLearningCycle
                }
                schoolworkCount={
                  schoolworkEvidence.bySkillId.get(
                    String(
                      focus.skill_id,
                    ),
                  )?.event_count ?? 0
                }
                teachingSignals={
                  teachingSignalsForRecommendation(
                    focus,
                    teachingEvidence.byConceptKey,
                  )
                }
              />
            </section>
          )}

          {build.length > 0 && (
            <section
              className={
                styles.buildSection
              }
            >
              <div
                className={
                  styles.sectionHeading
                }
              >
                <div>
                  <span>
                    {
                      LANE_META
                        .build_next
                        .eyebrow
                    }
                  </span>
                  <h3>
                    {
                      LANE_META
                        .build_next
                        .sectionTitle
                    }
                  </h3>
                  <p>
                    {
                      LANE_META
                        .build_next
                        .sectionDescription
                    }
                  </p>
                </div>

                <b>
                  {build.length}{" "}
                  {build.length === 1
                    ? "concept"
                    : "concepts"}
                </b>
              </div>

              <div
                className={
                  styles.buildGrid
                }
              >
                {build.map((item) => (
                  <RecommendationCard
                    key={item.id}
                    item={item}
                    learnerLabel={learnerLabel}
                    canLaunchPractice={
                      canLaunchPractice
                    }
                    isAdminPreview={
                      isAdminPreview
                    }
                    schoolworkCount={
                      schoolworkEvidence.bySkillId.get(
                        String(
                          item.skill_id,
                        ),
                      )?.event_count ??
                      0
                    }
                    teachingSignals={
                      teachingSignalsForRecommendation(
                        item,
                        teachingEvidence.byConceptKey,
                      )
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {finish && (
            <section
              className={
                styles.finishSection
              }
            >
              <div
                className={
                  styles.sectionHeading
                }
              >
                <div>
                  <span>
                    {
                      LANE_META[
                        finish.lane
                      ].eyebrow
                    }
                  </span>
                  <h3>
                    {
                      LANE_META[
                        finish.lane
                      ].sectionTitle
                    }
                  </h3>
                  <p>
                    {
                      LANE_META[
                        finish.lane
                      ]
                        .sectionDescription
                    }
                  </p>
                </div>

                <b>
                  {finish.lane ===
                  "reassess"
                    ? "1 concept"
                    : "1 stretch"}
                </b>
              </div>

              <RecommendationCard
                item={finish}
                learnerLabel={learnerLabel}
                canLaunchPractice={
                  canLaunchPractice
                }
                isAdminPreview={
                  isAdminPreview
                }
                schoolworkCount={
                  schoolworkEvidence.bySkillId.get(
                    String(
                      finish.skill_id,
                    ),
                  )?.event_count ?? 0
                }
                teachingSignals={
                  teachingSignalsForRecommendation(
                    finish,
                    teachingEvidence.byConceptKey,
                  )
                }
              />
            </section>
          )}
        </>
      )}

      <footer
        className={styles.planBridge}
      >
        <div>
          <span
            className={styles.eyebrow}
          >
            SEVEN-DAY PLAN
          </span>

          <h3>
            Nova Recommends decides
            what. Your weekly plan
            decides when.
          </h3>

          <p>
            This page stays
            concept-based and updates
            with learning evidence. The
            weekly plan remains
            {learnerLabel}&apos;s schedule.
          </p>
        </div>

        <a href="/learning-missions/progress-rewards">
          Open NOVA Learning Summary
          <span>→</span>
        </a>
      </footer>
    </section>
  );
}
