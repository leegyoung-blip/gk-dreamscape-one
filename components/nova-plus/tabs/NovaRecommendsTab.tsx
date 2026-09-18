"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  NovaRecommendation,
  NovaRecommendationLane,
  NovaRecommendationsPayload,
} from "@/lib/nova-plus/types";
import styles from "./NovaRecommendsTab.module.css";

type NovaRecommendsTabProps = {
  learnerId: string;
  learnerLabel: string;
  canLaunchPractice: boolean;
  isAdminPreview?: boolean;
};

type LaneMeta = {
  eyebrow: string;
  title: string;
  description: string;
  shortLabel: string;
  icon: string;
};

const LANE_META: Record<NovaRecommendationLane, LaneMeta> = {
  focus_now: {
    eyebrow: "TOP PRIORITY",
    title: "Focus Now",
    description: "The clearest evidence-backed priority in the learner profile.",
    shortLabel: "Focus Now",
    icon: "01",
  },
  build_next: {
    eyebrow: "BUILDING",
    title: "Build Next",
    description: "Concepts that are developing or need more evidence before Nova confirms a gap.",
    shortLabel: "Build Next",
    icon: "02",
  },
  reassess: {
    eyebrow: "CHECK AGAIN",
    title: "Reassess",
    description: "A concept ready for a fresh check after earlier difficulty or review signals.",
    shortLabel: "Reassess",
    icon: "03",
  },
  stretch: {
    eyebrow: "READY TO EXTEND",
    title: "Stretch",
    description: "A secure concept that can support a harder challenge.",
    shortLabel: "Stretch",
    icon: "04",
  },
};

const SUBJECT_LABELS: Record<"english" | "math", string> = {
  english: "English",
  math: "Mathematics",
};

function numberValue(value: number | null | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function percentage(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${Math.round(numberValue(value))}%`;
}

function trendLabel(item: NovaRecommendation) {
  const points = numberValue(item.trend_points);
  if (item.trend === "improving") {
    return points ? `Improving +${Math.round(points)} pts` : "Improving";
  }
  if (item.trend === "declining") {
    return points ? `Declining ${Math.round(points)} pts` : "Declining";
  }
  if (item.trend === "stable") return "Stable";
  return "Not enough trend data";
}

function dateLabel(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";

  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function laneClass(lane: NovaRecommendationLane) {
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

function actionLabel(lane: NovaRecommendationLane, preview: boolean) {
  if (preview) return "Preview Mission";
  if (lane === "reassess") return "Reassess Now";
  if (lane === "stretch") return "Start Challenge";
  return "Start Practice";
}

function RecommendationCard({
  item,
  canLaunchPractice,
  isAdminPreview,
  featured = false,
}: {
  item: NovaRecommendation;
  canLaunchPractice: boolean;
  isAdminPreview: boolean;
  featured?: boolean;
}) {
  const meta = LANE_META[item.lane];
  const quizHref = item.quiz?.quiz_href || "";
  const mayOpen = Boolean(quizHref) && (canLaunchPractice || isAdminPreview);
  const preview = isAdminPreview && !canLaunchPractice;

  return (
    <article
      className={`${styles.recommendationCard} ${laneClass(item.lane)} ${
        featured ? styles.featuredCard : ""
      }`}
    >
      <div className={styles.cardTop}>
        <div className={styles.laneIdentity}>
          <span className={styles.laneNumber}>{meta.icon}</span>
          <div>
            <small>{meta.eyebrow}</small>
            <strong>{meta.shortLabel}</strong>
          </div>
        </div>

        <div className={styles.subjectBadge}>
          {SUBJECT_LABELS[item.subject]} · P{item.primary_level}
        </div>
      </div>

      <div className={styles.conceptCopy}>
        <span>{item.topic}</span>
        <h3>{item.skill_name}</h3>
        {item.public_explanation && <p>{item.public_explanation}</p>}
      </div>

      <div className={styles.novaReason}>
        <div className={styles.reasonMark}>N+</div>
        <p>{item.reason}</p>
      </div>

      <div className={styles.recommendedMission}>
        <div>
          <small>RECOMMENDED MISSION</small>
          <strong>{item.quiz.quiz_title}</strong>
          <span>
            {item.quiz.quiz_type || "Practice"}
            {item.quiz.quiz_skill_coverage_percentage !== null
              ? ` · ${Math.round(
                  numberValue(item.quiz.quiz_skill_coverage_percentage),
                )}% concept coverage`
              : ""}
          </span>
        </div>

        {mayOpen ? (
          <a className={styles.startButton} href={quizHref}>
            {actionLabel(item.lane, preview)}
            <span>→</span>
          </a>
        ) : (
          <div className={styles.viewerNotice}>
            <strong>For {SUBJECT_LABELS[item.subject]} practice</strong>
            <span>
              Open NOVA+ from the learner account to start this mission without
              recording the attempt under the viewer&apos;s account.
            </span>
          </div>
        )}
      </div>

      <details className={styles.whyPanel}>
        <summary>
          <span>Why this?</span>
          <b>View evidence</b>
        </summary>

        <div className={styles.evidenceGrid}>
          <div>
            <small>Questions analysed</small>
            <strong>{item.questions_analyzed}</strong>
          </div>
          <div>
            <small>Separate attempts</small>
            <strong>{item.separate_attempts}</strong>
          </div>
          <div>
            <small>Recent errors</small>
            <strong>{item.recent_errors}</strong>
          </div>
          <div>
            <small>Mastery</small>
            <strong>{percentage(item.mastery_score)}</strong>
          </div>
          <div>
            <small>Confidence</small>
            <strong>{percentage(item.confidence_score)}</strong>
          </div>
          <div>
            <small>Trend</small>
            <strong>{trendLabel(item)}</strong>
          </div>
          <div>
            <small>Last practised</small>
            <strong>{dateLabel(item.last_practised_at)}</strong>
          </div>
          <div>
            <small>Quiz coverage</small>
            <strong>
              {percentage(item.quiz.quiz_skill_coverage_percentage)}
            </strong>
          </div>
        </div>

        {item.evidence_quality !== "ready" && (
          <p className={styles.evidenceNote}>
            Nova is treating this as developing evidence, not a confirmed
            learning gap.
          </p>
        )}

        {item.alternatives?.length > 0 && (
          <div className={styles.alternatives}>
            <small>OTHER SUITABLE MISSIONS</small>
            <div>
              {item.alternatives.map((alternative) =>
                alternative.quiz_href &&
                (canLaunchPractice || isAdminPreview) ? (
                  <a
                    href={alternative.quiz_href}
                    key={alternative.quiz_id}
                  >
                    <span>{alternative.quiz_title}</span>
                    <b>
                      {alternative.quiz_skill_coverage_percentage !== null
                        ? `${Math.round(
                            numberValue(
                              alternative.quiz_skill_coverage_percentage,
                            ),
                          )}%`
                        : "Open"}
                    </b>
                  </a>
                ) : (
                  <div key={alternative.quiz_id}>
                    <span>{alternative.quiz_title}</span>
                    <b>
                      {alternative.quiz_skill_coverage_percentage !== null
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

export default function NovaRecommendsTab({
  learnerId,
  learnerLabel,
  canLaunchPractice,
  isAdminPreview = false,
}: NovaRecommendsTabProps) {
  const [payload, setPayload] = useState<NovaRecommendationsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      const { data, error: rpcError } = await supabase.rpc(
        "get_nova_plus_recommendations",
        { p_student_user_id: learnerId },
      );

      if (cancelled) return;

      if (rpcError) {
        setPayload(null);
        setError(rpcError.message);
        setLoading(false);
        return;
      }

      setPayload((data ?? null) as NovaRecommendationsPayload | null);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [learnerId]);

  const recommendations = payload?.recommendations ?? [];

  const grouped = useMemo(() => {
    const groups: Record<NovaRecommendationLane, NovaRecommendation[]> = {
      focus_now: [],
      build_next: [],
      reassess: [],
      stretch: [],
    };

    for (const item of recommendations) {
      if (groups[item.lane]) groups[item.lane].push(item);
    }

    return groups;
  }, [recommendations]);

  const focus = grouped.focus_now[0] ?? null;
  const build = grouped.build_next.slice(0, 2);
  const finish = grouped.reassess[0] ?? grouped.stretch[0] ?? null;

  return (
    <section className={styles.page}>
      <header className={styles.introCard}>
        <div>
          <span className={styles.eyebrow}>NOVA RECOMMENDS</span>
          <h2>Know exactly what to work on next</h2>
          <p>
            Nova turns {learnerLabel}&apos;s latest concept evidence into a
            small number of priorities — not another long analytics list.
          </p>
        </div>

        <div className={styles.intelligenceKey}>
          <span>
            <i className={styles.focusDot} />
            Confirmed priority
          </span>
          <span>
            <i className={styles.buildDot} />
            Developing evidence
          </span>
          <span>
            <i className={styles.reassessDot} />
            Ready to check again
          </span>
          <span>
            <i className={styles.stretchDot} />
            Ready to stretch
          </span>
        </div>
      </header>

      {loading ? (
        <div className={styles.stateCard}>
          <span className={styles.loader} />
          <strong>Nova is ranking the next best actions…</strong>
          <p>
            Using current mastery, evidence confidence, recent errors and
            available mapped missions.
          </p>
        </div>
      ) : error ? (
        <div className={styles.stateCard}>
          <span className={styles.stateMark}>N+</span>
          <strong>Recommendations could not be loaded.</strong>
          <p>{error}</p>
        </div>
      ) : recommendations.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyOrb}>N+</div>
          <div>
            <span className={styles.eyebrow}>BUILDING THE PICTURE</span>
            <h3>No priority needs to be forced yet.</h3>
            <p>
              Nova needs more mapped English or Mathematics evidence before it
              can make a confident recommendation. Untouched concepts are not
              treated as weaknesses.
            </p>
          </div>
        </div>
      ) : (
        <>
          {focus && (
            <section className={styles.focusSection}>
              <div className={styles.sectionHeading}>
                <div>
                  <span>{LANE_META.focus_now.eyebrow}</span>
                  <h3>{LANE_META.focus_now.title}</h3>
                  <p>{LANE_META.focus_now.description}</p>
                </div>
                <b>1 priority</b>
              </div>
              <RecommendationCard
                item={focus}
                canLaunchPractice={canLaunchPractice}
                isAdminPreview={isAdminPreview}
                featured
              />
            </section>
          )}

          {build.length > 0 && (
            <section className={styles.buildSection}>
              <div className={styles.sectionHeading}>
                <div>
                  <span>{LANE_META.build_next.eyebrow}</span>
                  <h3>{LANE_META.build_next.title}</h3>
                  <p>{LANE_META.build_next.description}</p>
                </div>
                <b>{build.length} {build.length === 1 ? "concept" : "concepts"}</b>
              </div>

              <div className={styles.buildGrid}>
                {build.map((item) => (
                  <RecommendationCard
                    key={item.id}
                    item={item}
                    canLaunchPractice={canLaunchPractice}
                    isAdminPreview={isAdminPreview}
                  />
                ))}
              </div>
            </section>
          )}

          {finish && (
            <section className={styles.finishSection}>
              <div className={styles.sectionHeading}>
                <div>
                  <span>{LANE_META[finish.lane].eyebrow}</span>
                  <h3>{LANE_META[finish.lane].title}</h3>
                  <p>{LANE_META[finish.lane].description}</p>
                </div>
                <b>{finish.lane === "reassess" ? "Fresh check" : "Extension"}</b>
              </div>

              <RecommendationCard
                item={finish}
                canLaunchPractice={canLaunchPractice}
                isAdminPreview={isAdminPreview}
              />
            </section>
          )}
        </>
      )}

      <footer className={styles.planBridge}>
        <div>
          <span className={styles.eyebrow}>SEVEN-DAY PLAN</span>
          <h3>Priorities decide what. The weekly plan decides when.</h3>
          <p>
            Nova Recommends stays concept-driven and changes with learning
            evidence. The standard Seven-Day Plan remains the learner&apos;s
            weekly schedule.
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
