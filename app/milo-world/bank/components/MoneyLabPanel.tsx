"use client";

import { useMemo, useState } from "react";
import { useMoneyLab } from "../hooks/useMoneyLab";
import type { BankScreenMode } from "../lib/bank-types";
import { MONEY_LAB_LESSONS, MONEY_LAB_TOTAL_REWARD } from "../lib/money-lab-content";
import type { MoneyLabLesson } from "../lib/money-lab-types";
import MoneyLessonCard from "./MoneyLessonCard";
import MoneyLessonModal from "./MoneyLessonModal";

export default function MoneyLabPanel({
  screenMode,
  isLoggedIn,
}: {
  screenMode: BankScreenMode;
  isLoggedIn: boolean;
}) {
  const isMobile = screenMode === "mobile";
  const lab = useMoneyLab(isLoggedIn);
  const [selectedLesson, setSelectedLesson] = useState<MoneyLabLesson | null>(null);

  const completionPercent = useMemo(
    () => Math.round((lab.completedCount / MONEY_LAB_LESSONS.length) * 100),
    [lab.completedCount],
  );

  if (!isLoggedIn) {
    return (
      <section style={{ marginTop: "18px", minHeight: "360px", borderRadius: isMobile ? "24px" : "28px", border: "1px solid rgba(126,232,255,0.14)", background: "linear-gradient(145deg, rgba(7,25,47,0.82), rgba(6,9,26,0.9))", display: "flex", alignItems: "center", justifyContent: "center", padding: "28px", textAlign: "center" }}>
        <div style={{ maxWidth: "530px" }}>
          <div style={{ width: "66px", height: "66px", margin: "0 auto", borderRadius: "21px", border: "1px solid rgba(126,232,255,0.24)", background: "rgba(83,215,255,0.08)", color: "#8ee8ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "27px" }}>▦</div>
          <h2 style={{ margin: "18px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "34px" : "42px", lineHeight: 1, fontWeight: 500 }}>Learn money by doing.</h2>
          <p style={{ margin: "14px auto 0", color: "rgba(255,255,255,0.54)", fontSize: "13px", lineHeight: 1.6 }}>Log in to complete Money Lab lessons, track your progress and earn each lesson’s DT reward once.</p>
          <a href="/login" style={{ marginTop: "20px", minHeight: "48px", padding: "0 20px", borderRadius: "13px", border: "1px solid rgba(126,232,255,0.38)", background: "rgba(83,215,255,0.12)", color: "white", textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 900, letterSpacing: "0.07em", textTransform: "uppercase" }}>Log In</a>
        </div>
      </section>
    );
  }

  return (
    <section style={{ marginTop: "18px" }}>
      <div style={{ borderRadius: isMobile ? "24px" : "28px", border: "1px solid rgba(126,232,255,0.16)", background: "radial-gradient(circle at 85% 0%, rgba(133,98,230,0.10), transparent 32%), radial-gradient(circle at 10% 10%, rgba(83,215,255,0.09), transparent 28%), linear-gradient(145deg, rgba(7,28,50,0.88), rgba(5,11,28,0.94))", padding: isMobile ? "20px" : "26px 28px", boxShadow: "0 24px 70px rgba(0,0,0,0.20)" }}>
        <p style={{ margin: 0, color: "#8ee8ff", fontSize: "10px", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>Money Lab</p>
        <h2 style={{ margin: "8px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "36px" : "44px", lineHeight: 1, fontWeight: 500, letterSpacing: "-0.035em" }}>Learn it. Try it. Use it.</h2>
        <p style={{ margin: "11px 0 0", maxWidth: "760px", color: "rgba(255,255,255,0.54)", fontSize: "13px", lineHeight: 1.6 }}>Six short lessons explain the money ideas used across Milo’s Bank and Exchange. Each lesson gives a one-time 5 DT completion reward.</p>

        <div style={{ marginTop: "22px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.4fr repeat(2, minmax(0, 0.7fr))", gap: "10px" }}>
          <div style={{ borderRadius: "18px", border: "1px solid rgba(126,232,255,0.13)", background: "rgba(3,12,28,0.50)", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
              <div><div style={{ color: "rgba(255,255,255,0.42)", fontSize: "9px", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>Course progress</div><div style={{ marginTop: "5px", fontSize: "22px", fontWeight: 900 }}>{lab.completedCount} / {MONEY_LAB_LESSONS.length} lessons</div></div>
              <div style={{ color: "#8ee8ff", fontSize: "20px", fontWeight: 900 }}>{completionPercent}%</div>
            </div>
            <div style={{ marginTop: "12px", height: "7px", borderRadius: "999px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}><div style={{ width: `${completionPercent}%`, height: "100%", borderRadius: "999px", background: "linear-gradient(90deg, #58d8ff, #8cf0ca)", transition: "width 220ms ease" }} /></div>
          </div>
          <div style={{ borderRadius: "18px", border: "1px solid rgba(113,236,176,0.13)", background: "rgba(18,61,53,0.31)", padding: "16px" }}><div style={{ color: "rgba(255,255,255,0.42)", fontSize: "9px", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>DT earned</div><div style={{ marginTop: "6px", color: "#9af3c3", fontSize: "22px", fontWeight: 900 }}>{lab.totalRewardEarned.toLocaleString("en-SG")} DT</div></div>
          <div style={{ borderRadius: "18px", border: "1px solid rgba(255,209,138,0.13)", background: "rgba(84,58,22,0.24)", padding: "16px" }}><div style={{ color: "rgba(255,255,255,0.42)", fontSize: "9px", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>Course rewards</div><div style={{ marginTop: "6px", color: "#ffd18a", fontSize: "22px", fontWeight: 900 }}>{MONEY_LAB_TOTAL_REWARD} DT max</div></div>
        </div>
      </div>

      {lab.error && (
        <div
          role="alert"
          style={{
            marginTop: "12px",
            borderRadius: "15px",
            border: "1px solid rgba(255,121,121,0.22)",
            background: "rgba(244,91,91,0.07)",
            padding: "13px 15px",
            color: "#ffc0c0",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <span>{lab.error}</span>
          <button
            type="button"
            onClick={() => lab.refresh()}
            style={{
              minHeight: "34px",
              padding: "0 12px",
              borderRadius: "10px",
              border: "1px solid rgba(255,192,192,0.22)",
              background: "rgba(255,255,255,0.04)",
              color: "#ffd0d0",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "9px",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {lab.loading && (
        <div
          style={{
            marginTop: "12px",
            borderRadius: "14px",
            border: "1px solid rgba(126,232,255,0.09)",
            background: "rgba(255,255,255,0.02)",
            padding: "11px 13px",
            color: "rgba(255,255,255,0.40)",
            fontSize: "10px",
          }}
        >
          Loading your Money Lab progress…
        </div>
      )}

      <div style={{ marginTop: "14px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : screenMode === "compact" ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))", gap: "12px" }}>
        {MONEY_LAB_LESSONS.map((lesson) => (
          <MoneyLessonCard key={lesson.key} lesson={lesson} completed={lab.completedKeys.has(lesson.key)} locked={lab.loading || lab.actionLoading} screenMode={screenMode} onOpen={() => setSelectedLesson(lesson)} />
        ))}
      </div>

      <div style={{ marginTop: "14px", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", padding: "14px 16px", color: "rgba(255,255,255,0.42)", fontSize: "11px", lineHeight: 1.6 }}>
        <strong style={{ color: "rgba(255,255,255,0.68)" }}>Learning note:</strong> Dream Tokens, Milo’s Bank Bonds and Milo’s Exchange are fictional learning systems. Real-world investments can gain or lose value and do not guarantee returns.
      </div>

      <MoneyLessonModal lesson={selectedLesson} open={Boolean(selectedLesson)} alreadyCompleted={selectedLesson ? lab.completedKeys.has(selectedLesson.key) : false} loading={lab.actionLoading} onClose={() => setSelectedLesson(null)} onComplete={lab.completeLesson} />
    </section>
  );
}
