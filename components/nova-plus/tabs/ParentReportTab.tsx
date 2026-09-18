"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  NovaPlusProfilePayload,
  NovaRecommendation,
  NovaRecommendationsPayload,
  ProfileSkill,
  ProfileSnapshot,
} from "@/lib/nova-plus/types";
import styles from "./ParentReportTab.module.css";

type ParentReportTabProps = {
  profile: NovaPlusProfilePayload;
  learnerId: string;
  learnerLabel: string;
  onOpenRecommendations: () => void;
};

type TimeframeKey = "7" | "30" | "90";

type ParentMetric = {
  label: string;
  value: string;
  note: string;
};

type HomeTip = {
  title: string;
  body: string;
  subject: "english" | "math";
};

const TIMEFRAMES: Array<{
  key: TimeframeKey;
  label: string;
  days: number;
}> = [
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "3 months", days: 90 },
];

function asNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function windowStart(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days + 1);
  return date;
}

function isWithin(value: string | null | undefined, days: number) {
  const date = safeDate(value);
  if (!date) return false;
  return date >= windowStart(days);
}

function formatDate(value: string | null | undefined) {
  const date = safeDate(value);
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function subjectLabel(subject: string) {
  return subject.toLowerCase() === "math" ? "Mathematics" : "English";
}

function isCanonicalAcademicSkill(skill: ProfileSkill) {
  const subject = skill.subject.toLowerCase();

  if (!["english", "math"].includes(subject)) return false;
  if (skill.is_topic_level) return false;
  if (skill.source !== "nova_curriculum_rollout_sql") return false;

  if (subject === "english") {
    const scope = `${skill.domain} ${skill.topic} ${skill.skill_name}`.toLowerCase();
    if (scope.includes("listening") || scope.includes("viewing")) return false;
  }

  return true;
}

function isStrongSkill(skill: ProfileSkill) {
  return (
    ["secure", "mastered"].includes(skill.status) &&
    skill.questions_attempted >= 5 &&
    skill.confidence_score >= 55
  );
}

function isConfirmedSupportSkill(skill: ProfileSkill) {
  return (
    skill.status === "needs_support" &&
    skill.granular_eligible &&
    skill.evidence_quality === "ready" &&
    skill.questions_attempted >= 5 &&
    skill.confidence_score >= 55
  );
}

function isBuildingEvidenceSkill(skill: ProfileSkill) {
  if (isConfirmedSupportSkill(skill)) return false;

  return (
    ["emerging", "developing", "not_enough_data"].includes(skill.status) &&
    skill.questions_attempted >= 3 &&
    (skill.recent_wrong_answers > 0 || skill.trend === "declining")
  );
}

function parseSubjectSummaries(snapshot: ProfileSnapshot) {
  const raw = snapshot.subject_summaries;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const row = item as Record<string, unknown>;
      const subject = String(row.subject ?? "").toLowerCase();

      if (!["english", "math"].includes(subject)) return null;

      return {
        subject,
        mastery: asNumber(row.mastery_score),
        questions: asNumber(row.questions_attempted),
        secure: asNumber(row.secure_skills),
        priority: asNumber(row.priority_skills),
      };
    })
    .filter(
      (
        item,
      ): item is {
        subject: string;
        mastery: number | null;
        questions: number | null;
        secure: number | null;
        priority: number | null;
      } => Boolean(item),
    );
}

function baselineSnapshot(
  profile: NovaPlusProfilePayload,
  days: number,
): ProfileSnapshot | null {
  const start = windowStart(days).getTime();

  const timeline = [...(profile.timeline ?? [])]
    .filter((snapshot) => snapshot.snapshot_date || snapshot.generated_at)
    .sort((a, b) => {
      const left =
        safeDate(a.snapshot_date ?? a.generated_at)?.getTime() ?? 0;
      const right =
        safeDate(b.snapshot_date ?? b.generated_at)?.getTime() ?? 0;
      return left - right;
    });

  const before = timeline.filter((snapshot) => {
    const date = safeDate(snapshot.snapshot_date ?? snapshot.generated_at);
    return date ? date.getTime() <= start : false;
  });

  return before[before.length - 1] ?? timeline[0] ?? null;
}

function questionCountFromSnapshot(snapshot: ProfileSnapshot | null) {
  if (!snapshot) return null;

  const direct = asNumber(snapshot.source_question_count);
  if (direct !== null) return direct;

  const summaries = parseSubjectSummaries(snapshot);
  if (!summaries.length) return null;

  return summaries.reduce((sum, item) => sum + (item.questions ?? 0), 0);
}

function currentAcademicQuestions(profile: NovaPlusProfilePayload) {
  const latest = questionCountFromSnapshot(profile.latest_snapshot);
  if (latest !== null) return latest;

  return profile.subject_summaries
    .filter((item) =>
      ["english", "math"].includes(item.subject.toLowerCase()),
    )
    .reduce((sum, item) => sum + Number(item.questions_attempted ?? 0), 0);
}

function currentSubjectMastery(
  profile: NovaPlusProfilePayload,
  subject: "english" | "math",
) {
  return (
    profile.subject_summaries.find(
      (item) => item.subject.toLowerCase() === subject,
    )?.mastery_score ?? null
  );
}

function strongestSubject(profile: NovaPlusProfilePayload) {
  return (["english", "math"] as const)
    .map((subject) => ({
      subject,
      mastery: currentSubjectMastery(profile, subject),
    }))
    .filter((item): item is { subject: "english" | "math"; mastery: number } =>
      Number.isFinite(item.mastery),
    )
    .sort((a, b) => b.mastery - a.mastery)[0] ?? null;
}

function consistencyLabel(skills: ProfileSkill[], questions: number) {
  const activeWeeks = Math.max(
    0,
    ...skills.map((skill) => Number(skill.active_weeks ?? 0)),
  );

  if (questions >= 35 && activeWeeks >= 3) {
    return {
      value: "Consistent",
      note: "Learning evidence has been recorded across several weeks.",
    };
  }

  if (questions >= 15 || activeWeeks >= 2) {
    return {
      value: "Building",
      note: "A learning pattern is forming, with room for more regular practice.",
    };
  }

  return {
    value: "Early",
    note: "Nova is still building a reliable picture of learning consistency.",
  };
}

function parentSummary(
  profile: NovaPlusProfilePayload,
  improved: ProfileSkill[],
  support: ProfileSkill[],
  days: number,
) {
  const strongest = strongestSubject(profile);
  const period =
    days === 7 ? "This week" : days === 30 ? "This month" : "Over the last three months";

  const firstSentence = strongest
    ? `${period}, ${subjectLabel(strongest.subject)} is currently the strongest academic area at ${Math.round(
        strongest.mastery,
      )}% mastery.`
    : `${period}, Nova is still building a reliable overall academic picture.`;

  const movementSentence =
    improved.length > 0
      ? `${improved.length} concept${improved.length === 1 ? " has" : "s have"} shown positive movement.`
      : "There is not yet enough repeated evidence to call out a clear improvement trend.";

  const supportSentence =
    support.length > 0
      ? `${support[0].skill_name} would benefit from continued practice next.`
      : "No confirmed academic gap currently has enough evidence to require a parent alert.";

  return `${firstSentence} ${movementSentence} ${supportSentence}`;
}

function statusLabel(skill: ProfileSkill) {
  if (["secure", "mastered"].includes(skill.status)) return "Strong";
  if (skill.status === "needs_support") return "Needs Support";
  if (skill.status === "review_due") return "Ready to Reassess";
  return "Developing";
}

function homeTipForSkill(skill: ProfileSkill): HomeTip {
  const subject = skill.subject.toLowerCase() === "math" ? "math" : "english";
  const text = `${skill.domain} ${skill.topic} ${skill.skill_name}`.toLowerCase();

  if (subject === "english") {
    if (text.includes("noun")) {
      return {
        subject,
        title: "Spot nouns in everyday language",
        body: `Ask your child to find examples of ${skill.skill_name.toLowerCase()} in signs, books or conversation, then explain why each example fits.`,
      };
    }

    if (
      text.includes("grammar") ||
      text.includes("sentence") ||
      text.includes("verb") ||
      text.includes("adjective")
    ) {
      return {
        subject,
        title: "Turn the rule into an example",
        body: `Ask your child to make two original sentences that show ${skill.skill_name.toLowerCase()}, then explain the rule in their own words.`,
      };
    }

    if (text.includes("comprehension") || text.includes("inference")) {
      return {
        subject,
        title: "Ask for evidence from the text",
        body: `After reading a short passage together, ask one question linked to ${skill.skill_name.toLowerCase()} and have your child point to the words that support the answer.`,
      };
    }

    if (text.includes("vocabulary") || text.includes("word")) {
      return {
        subject,
        title: "Use the word in a new setting",
        body: `Choose two examples related to ${skill.skill_name.toLowerCase()} and ask your child to use them naturally in a new sentence or short conversation.`,
      };
    }

    return {
      subject,
      title: "Explain the English idea aloud",
      body: `Ask your child to explain ${skill.skill_name.toLowerCase()} in their own words and create one fresh example without looking at the quiz.`,
    };
  }

  if (text.includes("fraction")) {
    return {
      subject,
      title: "Use real objects for fractions",
      body: `Use food, paper or small objects to model ${skill.skill_name.toLowerCase()}. Ask your child to explain how they know the fractions are equal, larger or smaller.`,
    };
  }

  if (
    text.includes("shape") ||
    text.includes("geometry") ||
    text.includes("angle") ||
    text.includes("line")
  ) {
    return {
      subject,
      title: "Find the maths around the home",
      body: `Look for household examples connected to ${skill.skill_name.toLowerCase()} and ask your child to describe the mathematical features rather than only naming the object.`,
    };
  }

  if (
    text.includes("measurement") ||
    text.includes("length") ||
    text.includes("mass") ||
    text.includes("time") ||
    text.includes("volume")
  ) {
    return {
      subject,
      title: "Measure something real",
      body: `Choose one simple household task involving ${skill.skill_name.toLowerCase()} and ask your child to estimate first, measure second, then explain the difference.`,
    };
  }

  if (text.includes("percentage")) {
    return {
      subject,
      title: "Use percentages in daily life",
      body: `Use a simple price, score or group of 100 to discuss ${skill.skill_name.toLowerCase()}. Ask your child to connect the percentage to a fraction or decimal where possible.`,
    };
  }

  if (text.includes("ratio") || text.includes("rate")) {
    return {
      subject,
      title: "Compare two quantities",
      body: `Use a recipe, drink mix or everyday quantity pair to practise ${skill.skill_name.toLowerCase()}, then ask what would happen if both quantities doubled.`,
    };
  }

  if (text.includes("data") || text.includes("average") || text.includes("graph")) {
    return {
      subject,
      title: "Read a small set of real data",
      body: `Use a simple table, receipt or family tally to practise ${skill.skill_name.toLowerCase()} and ask your child what the data tells them.`,
    };
  }

  return {
    subject,
    title: "Ask for the method, not just the answer",
    body: `Give one short example involving ${skill.skill_name.toLowerCase()} and ask your child to solve it aloud, explaining each step and how they checked the result.`,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function printReport({
  learnerLabel,
  periodLabel,
  summary,
  metrics,
  strengths,
  support,
  recommendation,
  tips,
}: {
  learnerLabel: string;
  periodLabel: string;
  summary: string;
  metrics: ParentMetric[];
  strengths: ProfileSkill[];
  support: ProfileSkill[];
  recommendation: NovaRecommendation | null;
  tips: HomeTip[];
}) {
  /*
   * IMPORTANT:
   * Do NOT use window.open() here.
   * Browsers can treat a newly opened report window as a pop-up and block it.
   *
   * Instead we create a temporary off-screen iframe, write the clean A4 report
   * into it, then call print() from that iframe. This avoids the pop-up blocker.
   * The browser's normal print dialog still appears so the parent can choose
   * "Save as PDF".
   */
  const previousFrame = document.getElementById(
    "nova-parent-report-print-frame",
  );

  previousFrame?.remove();

  const frame = document.createElement("iframe");
  frame.id = "nova-parent-report-print-frame";
  frame.setAttribute("title", "NOVA+ Parent Report PDF");
  frame.setAttribute("aria-hidden", "true");

  Object.assign(frame.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "1px",
    height: "1px",
    border: "0",
    opacity: "0",
    pointerEvents: "none",
    zIndex: "-1",
  });

  document.body.appendChild(frame);

  const strengthHtml = strengths.length
    ? strengths
        .map(
          (skill) => `
            <div class="item">
              <span class="green">STRONG</span>
              <h3>${escapeHtml(skill.skill_name)}</h3>
              <p>${escapeHtml(skill.public_explanation || skill.topic)}</p>
            </div>
          `,
        )
        .join("")
    : `<div class="empty">Nova is still gathering enough evidence to confirm a clear strength.</div>`;

  const supportHtml = support.length
    ? support
        .map(
          (skill) => `
            <div class="item">
              <span class="amber">CONTINUE PRACTISING</span>
              <h3>${escapeHtml(skill.skill_name)}</h3>
              <p>${escapeHtml(skill.public_explanation || skill.topic)}</p>
            </div>
          `,
        )
        .join("")
    : `<div class="empty">No confirmed academic gap currently needs a parent alert.</div>`;

  const recommendationHtml = recommendation
    ? `
      <div class="recommend">
        <span>NOVA RECOMMENDS NEXT</span>
        <h3>${escapeHtml(recommendation.skill_name)}</h3>
        <p>${escapeHtml(recommendation.reason)}</p>
        <b>${escapeHtml(recommendation.quiz.quiz_title)}</b>
      </div>
    `
    : `<div class="empty">Nova needs more mapped evidence before selecting a confident next priority.</div>`;

  const tipsHtml = tips
    .map(
      (tip) => `
        <div class="tip">
          <span>${escapeHtml(subjectLabel(tip.subject))}</span>
          <h3>${escapeHtml(tip.title)}</h3>
          <p>${escapeHtml(tip.body)}</p>
        </div>
      `,
    )
    .join("");

  const metricHtml = metrics
    .map(
      (metric) => `
        <div class="metric">
          <span>${escapeHtml(metric.label)}</span>
          <strong>${escapeHtml(metric.value)}</strong>
          <p>${escapeHtml(metric.note)}</p>
        </div>
      `,
    )
    .join("");

  const reportHtml = `
    <!doctype html>
    <html>
      <head>
        <title>NOVA+ Parent Report — ${escapeHtml(learnerLabel)}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 14mm; }

          * { box-sizing: border-box; }

          html,
          body {
            margin: 0;
            padding: 0;
            background: white;
          }

          body {
            color: #142033;
            font-family: Arial, Helvetica, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .report {
            width: 100%;
          }

          .header {
            padding: 22px;
            border-radius: 18px;
            color: white;
            background: linear-gradient(135deg, #0f3558, #221b50);
          }

          .brand {
            color: #9eefff;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: .16em;
          }

          h1 {
            margin: 8px 0 0;
            font-size: 29px;
            letter-spacing: -.04em;
          }

          .period {
            margin-top: 8px;
            color: rgba(255,255,255,.72);
            font-size: 11px;
          }

          .summary {
            margin-top: 14px;
            padding: 16px 18px;
            border: 1px solid #dce8f1;
            border-radius: 14px;
            font-size: 13px;
            line-height: 1.55;
          }

          .metrics {
            margin-top: 14px;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
          }

          .metric {
            padding: 11px;
            border: 1px solid #e2e9ef;
            border-radius: 12px;
            break-inside: avoid;
          }

          .metric span {
            display: block;
            color: #607284;
            font-size: 7px;
            font-weight: 900;
            letter-spacing: .09em;
          }

          .metric strong {
            display: block;
            margin-top: 5px;
            font-size: 20px;
          }

          .metric p {
            margin: 5px 0 0;
            color: #6f7f8f;
            font-size: 8px;
            line-height: 1.4;
          }

          .section {
            margin-top: 17px;
            break-inside: avoid-page;
          }

          .section-title {
            margin: 0 0 8px;
            font-size: 15px;
          }

          .grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
          }

          .item,
          .tip,
          .recommend {
            padding: 12px;
            border: 1px solid #e2e9ef;
            border-radius: 12px;
            break-inside: avoid;
          }

          .item span,
          .tip span,
          .recommend span {
            font-size: 7px;
            font-weight: 900;
            letter-spacing: .09em;
          }

          .green { color: #14875b; }
          .amber { color: #b77810; }

          .tip span,
          .recommend span {
            color: #6b55b5;
          }

          .item h3,
          .tip h3,
          .recommend h3 {
            margin: 6px 0 0;
            font-size: 11px;
          }

          .item p,
          .tip p,
          .recommend p {
            margin: 5px 0 0;
            color: #667788;
            font-size: 8px;
            line-height: 1.45;
          }

          .recommend {
            border-color: #d8caef;
            background: #faf8ff;
          }

          .recommend b {
            display: block;
            margin-top: 8px;
            font-size: 9px;
          }

          .empty {
            padding: 12px;
            border: 1px solid #e2e9ef;
            border-radius: 12px;
            color: #71808d;
            font-size: 9px;
          }

          .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #e6edf2;
            color: #8794a0;
            font-size: 7px;
            line-height: 1.4;
          }
        </style>
      </head>

      <body>
        <main class="report">
          <section class="header">
            <div class="brand">NOVA+ PARENT REPORT</div>
            <h1>${escapeHtml(learnerLabel)} — Learning Report</h1>
            <div class="period">
              ${escapeHtml(periodLabel)} · Generated ${escapeHtml(
                formatDate(new Date().toISOString()),
              )}
            </div>
          </section>

          <section class="summary">
            ${escapeHtml(summary)}
          </section>

          <section class="metrics">
            ${metricHtml}
          </section>

          <section class="section">
            <h2 class="section-title">What’s Going Well</h2>
            <div class="grid">${strengthHtml}</div>
          </section>

          <section class="section">
            <h2 class="section-title">What Needs Support</h2>
            <div class="grid">${supportHtml}</div>
          </section>

          <section class="section">
            <h2 class="section-title">What Nova Recommends Next</h2>
            ${recommendationHtml}
          </section>

          <section class="section">
            <h2 class="section-title">How You Can Help at Home</h2>
            <div class="grid">${tipsHtml}</div>
          </section>

          <div class="footer">
            This report summarises the learner’s recorded English and Mathematics evidence.
            It is designed to support discussion and planning, not to rank the learner
            against other students.
          </div>
        </main>
      </body>
    </html>
  `;

  const frameWindow = frame.contentWindow;
  const frameDocument = frame.contentDocument;

  if (!frameWindow || !frameDocument) {
    frame.remove();
    return;
  }

  // Keep non-null references for the nested callbacks below.
  // TypeScript does not preserve the narrowing of frameWindow/frameDocument
  // across later function closures.
  const printWindow: Window = frameWindow;
  const printDocument: Document = frameDocument;

  printDocument.open();
  printDocument.write(reportHtml);
  printDocument.close();

  let cleanedUp = false;

  function cleanup() {
    if (cleanedUp) return;
    cleanedUp = true;
    frame.remove();
  }

  function openPrintDialog() {
    /*
     * Give the iframe one render cycle before printing so its CSS/layout is
     * complete. No new browser window or tab is opened.
     */
    window.setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } finally {
        /*
         * afterprint fires after the print/save dialog closes in modern browsers.
         * The timeout is a fallback for browsers that do not fire afterprint
         * reliably for iframe printing.
         */
        window.setTimeout(cleanup, 60_000);
      }
    }, 120);
  }

  printWindow.addEventListener("afterprint", cleanup, { once: true });

  if (printDocument.readyState === "complete") {
    openPrintDialog();
  } else {
    frame.addEventListener("load", openPrintDialog, { once: true });
  }
}

export default function ParentReportTab({
  profile,
  learnerId,
  learnerLabel,
  onOpenRecommendations,
}: ParentReportTabProps) {
  const [timeframe, setTimeframe] = useState<TimeframeKey>("30");
  const [recommendations, setRecommendations] =
    useState<NovaRecommendationsPayload | null>(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);

  const period = TIMEFRAMES.find((item) => item.key === timeframe) ?? TIMEFRAMES[1];
  const days = period.days;

  useEffect(() => {
    let cancelled = false;

    async function loadRecommendations() {
      setRecommendationsLoading(true);

      const { data } = await supabase.rpc("get_nova_plus_recommendations", {
        p_student_user_id: learnerId,
      });

      if (cancelled) return;

      setRecommendations(
        (data ?? null) as NovaRecommendationsPayload | null,
      );
      setRecommendationsLoading(false);
    }

    void loadRecommendations();

    return () => {
      cancelled = true;
    };
  }, [learnerId]);

  const academicSkills = useMemo(
    () => profile.skills.filter(isCanonicalAcademicSkill),
    [profile.skills],
  );

  const recentSkills = useMemo(
    () => academicSkills.filter((skill) => isWithin(skill.last_attempted_at, days)),
    [academicSkills, days],
  );

  const strengths = useMemo(
    () =>
      [...academicSkills]
        .filter(isStrongSkill)
        .sort(
          (a, b) =>
            b.mastery_score - a.mastery_score ||
            b.confidence_score - a.confidence_score ||
            b.questions_attempted - a.questions_attempted,
        )
        .slice(0, 3),
    [academicSkills],
  );

  const confirmedSupport = useMemo(
    () =>
      [...academicSkills]
        .filter(isConfirmedSupportSkill)
        .sort(
          (a, b) =>
            a.mastery_score - b.mastery_score ||
            b.recent_wrong_answers - a.recent_wrong_answers ||
            b.questions_attempted - a.questions_attempted,
        )
        .slice(0, 3),
    [academicSkills],
  );

  const buildingEvidence = useMemo(
    () =>
      [...academicSkills]
        .filter(isBuildingEvidenceSkill)
        .sort(
          (a, b) =>
            b.recent_wrong_answers - a.recent_wrong_answers ||
            a.mastery_score - b.mastery_score,
        )
        .slice(0, 2),
    [academicSkills],
  );

  const improved = useMemo(
    () =>
      recentSkills
        .filter(
          (skill) =>
            skill.trend === "improving" &&
            Number(skill.trend_points ?? 0) > 0,
        )
        .sort(
          (a, b) =>
            Number(b.trend_points ?? 0) - Number(a.trend_points ?? 0),
        ),
    [recentSkills],
  );

  const newlySecure = useMemo(
    () =>
      improved.filter((skill) =>
        ["secure", "mastered"].includes(skill.status),
      ),
    [improved],
  );

  const resolvedConcerns = useMemo(
    () =>
      (profile.resolved_insights ?? []).filter(
        (insight) =>
          isWithin(insight.resolved_at, days) &&
          ["weak", "gap", "support", "priority"].some((token) =>
            insight.insight_type.toLowerCase().includes(token),
          ),
      ),
    [profile.resolved_insights, days],
  );

  const baseline = useMemo(
    () => baselineSnapshot(profile, days),
    [profile, days],
  );

  const currentQuestionCount = currentAcademicQuestions(profile);
  const baselineQuestionCount = questionCountFromSnapshot(baseline);
  const questionsCompleted =
    baselineQuestionCount === null
      ? currentQuestionCount
      : Math.max(0, currentQuestionCount - baselineQuestionCount);

  const consistency = consistencyLabel(recentSkills, questionsCompleted);

  const summary = useMemo(
    () =>
      parentSummary(
        profile,
        improved,
        confirmedSupport,
        days,
      ),
    [profile, improved, confirmedSupport, days],
  );

  const firstRecommendation =
    recommendations?.recommendations?.[0] ?? null;

  const reportMetrics: ParentMetric[] = [
    {
      label: "Questions completed",
      value: String(Math.round(questionsCompleted)),
      note: "Academic question evidence added in this report period.",
    },
    {
      label: "Concepts strengthened",
      value: String(improved.length),
      note: "Concepts showing positive recent movement.",
    },
    {
      label: "Currently strong",
      value: String(strengths.length),
      note: "Top evidence-backed strengths highlighted in this report.",
    },
    {
      label: "Learning consistency",
      value: consistency.value,
      note: consistency.note,
    },
  ];

  const homeTips = useMemo(() => {
    const sourceSkills: ProfileSkill[] = [];

    if (firstRecommendation) {
      const matched = academicSkills.find(
        (skill) => skill.skill_id === firstRecommendation.skill_id,
      );
      if (matched) sourceSkills.push(matched);
    }

    for (const skill of confirmedSupport) {
      if (!sourceSkills.some((item) => item.skill_id === skill.skill_id)) {
        sourceSkills.push(skill);
      }
    }

    for (const skill of buildingEvidence) {
      if (
        sourceSkills.length >= 3 ||
        sourceSkills.some((item) => item.skill_id === skill.skill_id)
      ) {
        continue;
      }
      sourceSkills.push(skill);
    }

    for (const skill of strengths) {
      if (
        sourceSkills.length >= 3 ||
        sourceSkills.some((item) => item.skill_id === skill.skill_id)
      ) {
        continue;
      }
      sourceSkills.push(skill);
    }

    return sourceSkills.slice(0, 3).map(homeTipForSkill);
  }, [
    firstRecommendation,
    academicSkills,
    confirmedSupport,
    buildingEvidence,
    strengths,
  ]);

  const periodComparison = baseline
    ? `Compared with the learner profile around ${formatDate(
        baseline.snapshot_date ?? baseline.generated_at,
      )}`
    : "Nova is still building a longer-term comparison baseline.";

  function handlePdf() {
    printReport({
      learnerLabel,
      periodLabel: period.label,
      summary,
      metrics: reportMetrics,
      strengths,
      support: confirmedSupport,
      recommendation: firstRecommendation,
      tips: homeTips,
    });
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>PARENT REPORT</span>
          <h2>A clear picture of how learning is going</h2>
          <p>
            A concise report for discussing {learnerLabel}&apos;s learning,
            progress and next steps at home.
          </p>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.timeframes} aria-label="Parent report timeframe">
            {TIMEFRAMES.map((item) => (
              <button
                key={item.key}
                type="button"
                className={timeframe === item.key ? styles.activeTimeframe : ""}
                onClick={() => setTimeframe(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={styles.pdfButton}
            onClick={handlePdf}
          >
            <span>⇩</span>
            Download PDF
          </button>
        </div>
      </header>

      <section className={styles.reportIntro}>
        <div className={styles.learnerIdentity}>
          <div className={styles.avatarMark}>N+</div>
          <div>
            <small>LEARNER</small>
            <h3>{learnerLabel}</h3>
            <p>
              {period.label} · Generated {formatDate(profile.generated_at)}
            </p>
          </div>
        </div>

        <div className={styles.novaSummary}>
          <span>NOVA SUMMARY</span>
          <p>{summary}</p>
        </div>
      </section>

      <section className={styles.metricsGrid}>
        {reportMetrics.map((metric) => (
          <article key={metric.label}>
            <small>{metric.label}</small>
            <strong>{metric.value}</strong>
            <p>{metric.note}</p>
          </article>
        ))}
      </section>

      <section className={styles.twoColumn}>
        <article className={styles.sectionCard}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.goodEyebrow}>WHAT&apos;S GOING WELL</span>
              <h3>Current strengths</h3>
            </div>
            <b>{strengths.length} highlighted</b>
          </div>

          <div className={styles.conceptList}>
            {strengths.length ? (
              strengths.map((skill) => (
                <details className={styles.conceptItem} key={skill.skill_id}>
                  <summary>
                    <div className={styles.conceptLead}>
                      <span className={styles.strongMark}>✓</span>
                      <div>
                        <small>
                          {subjectLabel(skill.subject)} · {skill.topic}
                        </small>
                        <strong>{skill.skill_name}</strong>
                        <p>
                          {skill.public_explanation ||
                            "Nova has enough repeated evidence to treat this as a current strength."}
                        </p>
                      </div>
                    </div>

                    <span className={styles.strongPill}>Strong</span>
                  </summary>

                  <div className={styles.evidenceRow}>
                    <span>
                      <small>Mastery</small>
                      <b>{Math.round(skill.mastery_score)}%</b>
                    </span>
                    <span>
                      <small>Questions</small>
                      <b>{skill.questions_attempted}</b>
                    </span>
                    <span>
                      <small>Confidence</small>
                      <b>{Math.round(skill.confidence_score)}%</b>
                    </span>
                    <span>
                      <small>Trend</small>
                      <b>{skill.trend === "improving" ? "Improving" : "Stable"}</b>
                    </span>
                  </div>
                </details>
              ))
            ) : (
              <div className={styles.emptyState}>
                Nova is still gathering enough repeated evidence to confirm a
                clear academic strength.
              </div>
            )}
          </div>
        </article>

        <article className={styles.sectionCard}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.supportEyebrow}>WHAT NEEDS SUPPORT</span>
              <h3>Where practice can help</h3>
            </div>
            <b>{confirmedSupport.length} confirmed</b>
          </div>

          <div className={styles.conceptList}>
            {confirmedSupport.length ? (
              confirmedSupport.map((skill) => (
                <details className={styles.conceptItem} key={skill.skill_id}>
                  <summary>
                    <div className={styles.conceptLead}>
                      <span className={styles.supportMark}>!</span>
                      <div>
                        <small>
                          {subjectLabel(skill.subject)} · {skill.topic}
                        </small>
                        <strong>{skill.skill_name}</strong>
                        <p>
                          {skill.public_explanation ||
                            "This concept would benefit from more focused practice."}
                        </p>
                      </div>
                    </div>

                    <span className={styles.supportPill}>Needs Support</span>
                  </summary>

                  <div className={styles.evidenceRow}>
                    <span>
                      <small>Mastery</small>
                      <b>{Math.round(skill.mastery_score)}%</b>
                    </span>
                    <span>
                      <small>Questions</small>
                      <b>{skill.questions_attempted}</b>
                    </span>
                    <span>
                      <small>Recent errors</small>
                      <b>{skill.recent_wrong_answers}</b>
                    </span>
                    <span>
                      <small>Confidence</small>
                      <b>{Math.round(skill.confidence_score)}%</b>
                    </span>
                  </div>
                </details>
              ))
            ) : (
              <div className={styles.emptyState}>
                No academic gap currently has enough evidence to require a parent
                alert.
              </div>
            )}

            {buildingEvidence.length > 0 && (
              <div className={styles.buildingEvidence}>
                <small>STILL BUILDING EVIDENCE</small>
                {buildingEvidence.map((skill) => (
                  <div key={skill.skill_id}>
                    <span>{skill.skill_name}</span>
                    <b>{subjectLabel(skill.subject)}</b>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>
      </section>

      <section className={styles.progressSection}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>PROGRESS THIS PERIOD</span>
            <h3>What changed</h3>
          </div>
          <p>{periodComparison}</p>
        </div>

        <div className={styles.progressGrid}>
          <article>
            <span>↗</span>
            <small>Concepts improved</small>
            <strong>{improved.length}</strong>
          </article>
          <article>
            <span>◆</span>
            <small>Newly secure</small>
            <strong>{newlySecure.length}</strong>
          </article>
          <article>
            <span>✓</span>
            <small>Concerns resolved</small>
            <strong>{resolvedConcerns.length}</strong>
          </article>
          <article>
            <span>◎</span>
            <small>Questions completed</small>
            <strong>{Math.round(questionsCompleted)}</strong>
          </article>
        </div>

        {improved.length > 0 && (
          <div className={styles.movementStrip}>
            {improved.slice(0, 4).map((skill) => (
              <div key={skill.skill_id}>
                <span>{subjectLabel(skill.subject)}</span>
                <strong>{skill.skill_name}</strong>
                <b>
                  {skill.trend_points !== null &&
                  Number(skill.trend_points) > 0
                    ? `+${Math.round(Number(skill.trend_points))} pts`
                    : "Improving"}
                </b>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.recommendSection}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>WHAT NOVA RECOMMENDS NEXT</span>
            <h3>One clear next step</h3>
          </div>
          <button type="button" onClick={onOpenRecommendations}>
            View Nova Recommends
            <span>→</span>
          </button>
        </div>

        {recommendationsLoading ? (
          <div className={styles.recommendLoading}>
            Nova is checking the latest recommendation…
          </div>
        ) : firstRecommendation ? (
          <article className={styles.recommendCard}>
            <div className={styles.recommendBadge}>N+</div>
            <div className={styles.recommendCopy}>
              <small>
                {subjectLabel(firstRecommendation.subject)} · P
                {firstRecommendation.primary_level}
              </small>
              <h4>{firstRecommendation.skill_name}</h4>
              <p>{firstRecommendation.reason}</p>
              <div>
                <span>Recommended mission</span>
                <b>{firstRecommendation.quiz.quiz_title}</b>
              </div>
            </div>
          </article>
        ) : (
          <div className={styles.emptyState}>
            Nova needs more mapped evidence before selecting a confident next
            priority.
          </div>
        )}
      </section>

      <section className={styles.homeSection}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>HOW YOU CAN HELP AT HOME</span>
            <h3>Simple ways to support the next step</h3>
          </div>
          <p>Short, concept-specific ideas — not extra homework.</p>
        </div>

        <div className={styles.tipGrid}>
          {homeTips.map((tip, index) => (
            <article key={`${tip.title}-${index}`}>
              <div className={styles.tipNumber}>
                {String(index + 1).padStart(2, "0")}
              </div>
              <small>{subjectLabel(tip.subject)}</small>
              <h4>{tip.title}</h4>
              <p>{tip.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className={styles.footerNote}>
        <div>
          <strong>About this report</strong>
          <p>
            NOVA+ summarises recorded English and Mathematics evidence for this
            learner. It compares the learner with their own earlier learning,
            not with other students.
          </p>
        </div>

        <button type="button" onClick={handlePdf}>
          Download PDF
          <span>⇩</span>
        </button>
      </footer>
    </section>
  );
}
