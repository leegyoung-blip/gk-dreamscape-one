"use client";

import { useMemo, useState } from "react";
import { useFinancialAdvisor } from "../hooks/useFinancialAdvisor";
import { useFinancialCourse } from "../hooks/useFinancialCourse";
import { useFinancialCourseCompletion } from "../hooks/useFinancialCourseCompletion";
import type { BankScreenMode } from "../lib/bank-types";
import type { FinancialLessonDefinition } from "../lib/financial-learning-engine-types";
import type { MiloFinanceLessonSummary } from "../lib/financial-learning-content-types";
import FinancialAdvisorSelector from "./FinancialAdvisorSelector";
import FinancialLessonCard from "./FinancialLessonCard";
import FinancialLessonPlayer from "./FinancialLessonPlayer";
import BankingGrowthCourseSummary from "./BankingGrowthCourseSummary";

export default function FinancialCoursePanel({
  courseId,
  screenMode,
  isLoggedIn,
  hasMiloFinanceAccess,
  onOpenUpgrade,
}: {
  courseId: string;
  screenMode: BankScreenMode;
  isLoggedIn: boolean;
  hasMiloFinanceAccess: boolean;
  onOpenUpgrade: () => void;
}) {
  const isMobile = screenMode === "mobile";
  const advisor = useFinancialAdvisor(isLoggedIn);
  const course = useFinancialCourse(courseId, isLoggedIn);
  const courseCompletion = useFinancialCourseCompletion(courseId, isLoggedIn && courseId === "banking-growth");
  const [selectedLesson, setSelectedLesson] = useState<FinancialLessonDefinition | null>(null);
  const [opening, setOpening] = useState(false);

  const selectedCourse = course.courses.find((item) => item.id === courseId);
  const plannedLessons = useMemo(() => {
    const raw = selectedCourse?.metadata?.planned_lessons;
    const parsed = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? Math.max(parsed, course.lessons.length) : course.lessons.length;
  }, [selectedCourse?.metadata, course.lessons.length]);
  const completionPercent = useMemo(
    () => (plannedLessons ? Math.round((course.completedCount / plannedLessons) * 100) : 0),
    [course.completedCount, plannedLessons],
  );
  const partialRollout = plannedLessons > course.lessons.length;

  async function openLesson(summary: MiloFinanceLessonSummary) {
    if (summary.accessTier === "milo_finance" && !hasMiloFinanceAccess) {
      onOpenUpgrade();
      return;
    }
    setOpening(true);
    try {
      const loaded = await course.loadLesson(summary);
      setSelectedLesson(loaded.definition);
    } finally {
      setOpening(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <section style={{ marginTop: 14, minHeight: 320, borderRadius: isMobile ? 22 : 26, border: "1px solid rgba(126,232,255,.14)", background: "linear-gradient(145deg,rgba(7,25,47,.82),rgba(6,9,26,.9))", display: "flex", alignItems: "center", justifyContent: "center", padding: 28, textAlign: "center" }}>
        <div style={{ maxWidth: 560 }}>
          <p style={{ margin: 0, color: "#8ee8ff", fontSize: 9, fontWeight: 900, letterSpacing: ".16em", textTransform: "uppercase" }}>Milo Finance</p>
          <h2 style={{ margin: "12px 0 0", fontFamily: 'Georgia,"Times New Roman",serif', fontSize: isMobile ? 34 : 43, lineHeight: 1, fontWeight: 500 }}>Learn by making financial decisions.</h2>
          <p style={{ margin: "14px auto 0", color: "rgba(255,255,255,.54)", fontSize: 13, lineHeight: 1.65 }}>Log in to work through Dreamscape lessons with Nova or Milo as your advisor.</p>
          <a href="/login" style={{ marginTop: 20, minHeight: 48, padding: "0 20px", borderRadius: 13, border: "1px solid rgba(126,232,255,.38)", background: "rgba(83,215,255,.12)", color: "white", textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, letterSpacing: ".07em", textTransform: "uppercase" }}>Log In</a>
        </div>
      </section>
    );
  }

  return (
    <section style={{ marginTop: 14 }}>
      <div style={{ borderRadius: isMobile ? 22 : 26, border: "1px solid rgba(126,232,255,.14)", background: "radial-gradient(circle at 85% 0%,rgba(133,98,230,.09),transparent 34%),linear-gradient(145deg,rgba(7,28,50,.88),rgba(5,11,28,.94))", padding: isMobile ? 19 : "22px 24px" }}>
        <p style={{ margin: 0, color: "#8ee8ff", fontSize: 9, fontWeight: 900, letterSpacing: ".16em", textTransform: "uppercase" }}>Interactive course</p>
        <h2 style={{ margin: "7px 0 0", fontFamily: 'Georgia,"Times New Roman",serif', fontSize: isMobile ? 34 : 42, lineHeight: 1, fontWeight: 500 }}>{selectedCourse?.title ?? "Milo Finance"}</h2>
        <p style={{ margin: "10px 0 0", maxWidth: 820, color: "rgba(255,255,255,.52)", fontSize: 12, lineHeight: 1.6 }}>{selectedCourse?.description ?? "Interactive financial learning inside Dreamscape."}</p>

        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.4fr repeat(2,minmax(0,.7fr))", gap: 9 }}>
          <div style={summaryCard}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><div><div style={summaryLabel}>Course progress</div><div style={summaryValue}>{course.completedCount} / {plannedLessons} lessons</div></div><strong style={{ color: "#8ee8ff", fontSize: 19 }}>{completionPercent}%</strong></div><div style={{ marginTop: 10, height: 6, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden" }}><div style={{ width: `${completionPercent}%`, height: "100%", background: "linear-gradient(90deg,#58d8ff,#8cf0ca)" }} /></div></div>
          <div style={summaryCard}><div style={summaryLabel}>DT earned</div><div style={{ ...summaryValue, color: "#9af3c3" }}>{course.rewardEarned.toLocaleString("en-SG")} DT</div></div>
          <div style={summaryCard}><div style={summaryLabel}>{partialRollout ? "Live lesson rewards" : "Course rewards"}</div><div style={{ ...summaryValue, color: "#ffd18a" }}>{course.maxReward} DT {partialRollout ? "available now" : "max"}</div></div>
        </div>
      </div>

      {partialRollout ? (
        <div style={{ marginTop: 10, borderRadius: 13, border: "1px solid rgba(255,209,138,.13)", background: "rgba(255,190,90,.045)", padding: "10px 12px", color: "rgba(255,255,255,.46)", fontSize: 10, lineHeight: 1.55 }}>
          <strong style={{ color: "#ffd18a" }}>Course build in progress:</strong> {course.lessons.length} of {plannedLessons} planned lessons are currently live. Your progress and evidence are preserved as later lessons are added.
        </div>
      ) : null}

      <div style={{ marginTop: 12 }}><FinancialAdvisorSelector value={advisor.advisorId} onChange={advisor.setAdvisorId} saving={advisor.saving} compact={isMobile} /></div>

      {course.error ? <div role="alert" style={{ marginTop: 12, borderRadius: 14, border: "1px solid rgba(255,121,121,.22)", background: "rgba(244,91,91,.07)", padding: "12px 14px", color: "#ffc0c0", fontSize: 11, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><span>{course.error}</span><button type="button" onClick={() => course.refresh()} style={retryStyle}>Try Again</button></div> : null}

      <div style={{ marginTop: 13, display: "grid", gridTemplateColumns: isMobile ? "1fr" : screenMode === "compact" ? "repeat(2,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))", gap: 11 }}>
        {course.lessons.map((lesson) => {
          const locked = lesson.accessTier === "milo_finance" && !hasMiloFinanceAccess;
          return <FinancialLessonCard key={lesson.id} lesson={lesson} completed={course.completedLessonIds.has(lesson.id)} loading={course.loading || course.actionLoading || opening} screenMode={screenMode} locked={locked} onOpen={() => openLesson(lesson)} onLocked={onOpenUpgrade} />;
        })}
      </div>


      {courseId === "banking-growth" && courseCompletion.completion?.isCompleted ? (
        <BankingGrowthCourseSummary
          completion={courseCompletion.completion}
          skills={courseCompletion.skills}
          screenMode={screenMode}
        />
      ) : null}

      <FinancialLessonPlayer lesson={selectedLesson} open={Boolean(selectedLesson)} advisorId={advisor.advisorId} loading={course.actionLoading} onClose={() => setSelectedLesson(null)} onCheckpoint={(lesson, responses, lastBlockKey) => course.saveCheckpoint(lesson, advisor.advisorId, lastBlockKey, responses)} onComplete={(lesson, responses) => course.completeLesson(lesson, advisor.advisorId, responses)} />
    </section>
  );
}

const summaryCard = { borderRadius: 16, border: "1px solid rgba(126,232,255,.10)", background: "rgba(3,12,28,.46)", padding: 14 } as const;
const summaryLabel = { color: "rgba(255,255,255,.40)", fontSize: 8, fontWeight: 900, letterSpacing: ".10em", textTransform: "uppercase" } as const;
const summaryValue = { marginTop: 5, color: "white", fontSize: 20, fontWeight: 900 } as const;
const retryStyle = { minHeight: 32, padding: "0 11px", borderRadius: 9, border: "1px solid rgba(255,192,192,.22)", background: "rgba(255,255,255,.04)", color: "#ffd0d0", cursor: "pointer", fontFamily: "inherit", fontSize: 8, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".06em" } as const;
