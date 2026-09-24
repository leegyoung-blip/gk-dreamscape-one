"use client";

import type { BankScreenMode } from "../lib/bank-types";
import type { FinancialAdvisorId } from "../lib/financial-learning-engine-types";
import type {
  MiloFinanceCourseCompletion,
  MiloFinanceCourseSkillSummary,
} from "../lib/financial-course-completion-types";

function evidenceLabel(skill: MiloFinanceCourseSkillSummary) {
  if (skill.demonstratedCount > 0) return "Demonstrated";
  if (skill.appliedCount > 0) return "Applied";
  if (skill.observedCount > 0) return "Observed";
  return "Not evidenced yet";
}

function advisorText(
  advisorId: FinancialAdvisorId | null,
  skills: MiloFinanceCourseSkillSummary[],
) {
  const strongest = [...skills]
    .filter((skill) => skill.evidenceCount > 0)
    .sort((a, b) => b.evidencePoints - a.evidencePoints)
    .slice(0, 2)
    .map((skill) => skill.title);

  if (!strongest.length) {
    return advisorId === "nova"
      ? "You completed the course. The next step is to apply these ideas in more varied financial situations."
      : "Course complete. Now the useful part is taking these ideas into the Bank, Exchange and Business Builder.";
  }

  const area = strongest.join(" and ");
  return advisorId === "nova"
    ? `Your strongest recorded evidence in this course is concentrated in ${area}. That is evidence from your actual decisions and activities, not a percentage score.`
    : `You built the most evidence around ${area}. Keep using those ideas when the numbers, timing and trade-offs change elsewhere in Milo’s World.`;
}

export default function BankingGrowthCourseSummary({
  completion,
  skills,
  screenMode,
}: {
  completion: MiloFinanceCourseCompletion;
  skills: MiloFinanceCourseSkillSummary[];
  screenMode: BankScreenMode;
}) {
  const isMobile = screenMode === "mobile";
  const visibleSkills = skills.filter((skill) => skill.evidenceCount > 0);
  const completedOn = completion.completedAt
    ? new Date(completion.completedAt).toLocaleDateString("en-SG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <section
      style={{
        marginTop: 14,
        borderRadius: isMobile ? 22 : 26,
        border: "1px solid rgba(113,236,176,.20)",
        background:
          "radial-gradient(circle at 90% 0%,rgba(113,236,176,.10),transparent 32%),linear-gradient(145deg,rgba(8,36,42,.88),rgba(5,12,27,.94))",
        padding: isMobile ? 18 : "22px 24px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: 0, color: "#9af3c3", fontSize: 9, fontWeight: 900, letterSpacing: ".16em", textTransform: "uppercase" }}>
            Banking & Growth · Course complete
          </p>
          <h3 style={{ margin: "7px 0 0", fontFamily: 'Georgia,"Times New Roman",serif', fontSize: isMobile ? 31 : 38, lineHeight: 1, fontWeight: 500 }}>
            You finished the full strategy pathway.
          </h3>
          <p style={{ margin: "11px 0 0", maxWidth: 760, color: "rgba(255,255,255,.56)", fontSize: 12, lineHeight: 1.65 }}>
            {advisorText(completion.advisorId, skills)}
          </p>
        </div>
        <div style={{ borderRadius: 14, border: "1px solid rgba(113,236,176,.18)", background: "rgba(69,207,142,.06)", padding: "10px 13px", minWidth: 130 }}>
          <div style={{ color: "rgba(255,255,255,.36)", fontSize: 8, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em" }}>Completed</div>
          <div style={{ marginTop: 4, color: "#9af3c3", fontSize: 12, fontWeight: 900 }}>{completedOn ?? "Complete"}</div>
        </div>
      </div>

      {visibleSkills.length ? (
        <div style={{ marginTop: 17, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))", gap: 9 }}>
          {visibleSkills.slice(0, 6).map((skill) => (
            <div key={skill.skillKey} style={{ borderRadius: 15, border: "1px solid rgba(255,255,255,.08)", background: "rgba(3,12,28,.40)", padding: 13 }}>
              <div style={{ color: "rgba(255,255,255,.38)", fontSize: 8, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em" }}>{skill.title}</div>
              <div style={{ marginTop: 5, color: skill.demonstratedCount ? "#9af3c3" : skill.appliedCount ? "#8ee8ff" : "#ffd18a", fontSize: 15, fontWeight: 900 }}>{evidenceLabel(skill)}</div>
              <div style={{ marginTop: 4, color: "rgba(255,255,255,.38)", fontSize: 9 }}>{skill.evidenceCount} evidence records · {skill.evidencePoints} pts</div>
            </div>
          ))}
        </div>
      ) : null}

      <p style={{ margin: "14px 0 0", color: "rgba(255,255,255,.34)", fontSize: 9, lineHeight: 1.55 }}>
        These labels describe the evidence collected during this course. They are not a financial ability score and do not replace future practice in new situations.
      </p>
    </section>
  );
}
