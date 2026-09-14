"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MyLearningTab from "@/components/nova-plus/tabs/MyLearningTab";
import StrengthsGapsTab from "@/components/nova-plus/tabs/StrengthsGapsTab";
import MasteryMapTab from "@/components/nova-plus/tabs/MasteryMapTab";
import NovaRecommendsTab from "@/components/nova-plus/tabs/NovaRecommendsTab";
import ProgressTab from "@/components/nova-plus/tabs/ProgressTab";
import ParentReportTab from "@/components/nova-plus/tabs/ParentReportTab";
import { useNovaPlusProfile } from "@/hooks/useNovaPlusProfile";
import type { NovaPlusTab } from "@/lib/nova-plus/types";
import styles from "./NovaPlusDashboard.module.css";

const TABS: Array<{ key: NovaPlusTab; label: string; icon: string }> = [
  { key: "learning", label: "My Learning", icon: "◎" },
  { key: "strengths", label: "Strengths & Gaps", icon: "◐" },
  { key: "mastery", label: "Mastery Map", icon: "◇" },
  { key: "recommendations", label: "Nova Recommends", icon: "✦" },
  { key: "progress", label: "Progress", icon: "↗" },
  { key: "parent", label: "Parent Report", icon: "▤" },
];

export default function NovaPlusDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedLearnerId = searchParams.get("student");
  const [tab, setTab] = useState<NovaPlusTab>("learning");

  const {
    learners,
    selectedLearner,
    selectedLearnerId,
    profile,
    loading,
    refreshing,
    error,
    isAdminPreview,
    selectLearner,
    refresh,
  } = useNovaPlusProfile(requestedLearnerId);

  const title = useMemo(() => {
    const label = selectedLearner?.label?.trim();
    return label && label !== "Learner" ? `${label}'s Learning` : "Learner Intelligence";
  }, [selectedLearner?.label]);

  function closeNovaPlus() {
    router.push("/progress-rewards");
  }

  return (
    <main className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.brandBlock}>
          <div className={styles.logoMark}>N+</div>
          <div>
            <div className={styles.brandLine}>
              <span>NOVA+</span>
              {isAdminPreview && <em>Admin Preview</em>}
            </div>
            <h1>Learning Intelligence</h1>
            <p>{title}</p>
          </div>
        </div>

        <div className={styles.headerActions}>
          {learners.length > 1 && (
            <label className={styles.learnerPicker}>
              <span>Learner</span>
              <select
                value={selectedLearnerId ?? ""}
                onChange={(event) => void selectLearner(event.target.value)}
              >
                {learners.map((learner) => (
                  <option key={learner.id} value={learner.id}>
                    {learner.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button
            type="button"
            className={styles.refreshButton}
            disabled={refreshing || loading || !selectedLearnerId}
            onClick={() => void refresh()}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>

          <button
            type="button"
            className={styles.closeButton}
            onClick={closeNovaPlus}
            aria-label="Close NOVA+ and return to Progress & Rewards"
          >
            ×
          </button>
        </div>
      </header>

      <nav className={styles.tabs} aria-label="NOVA+ sections">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={tab === item.key ? styles.activeTab : ""}
            onClick={() => setTab(item.key)}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <section className={styles.content}>
        {loading && !profile ? (
          <div className={styles.stateCard}>
            <span className={styles.spinner} />
            <strong>Building the learner picture…</strong>
            <p>Nova is loading the persistent learning profile.</p>
          </div>
        ) : error && !profile ? (
          <div className={styles.stateCard}>
            <div className={styles.lockIcon}>N+</div>
            <strong>{isAdminPreview ? "NOVA+ could not load" : "NOVA+ is coming soon"}</strong>
            <p>{error}</p>
            <button type="button" onClick={closeNovaPlus}>Return to Progress & Rewards</button>
          </div>
        ) : !profile || !selectedLearnerId ? (
          <div className={styles.stateCard}>
            <strong>No learner profile is available yet.</strong>
          </div>
        ) : tab === "learning" ? (
          <MyLearningTab
            learnerId={selectedLearnerId}
            learnerLabel={selectedLearner?.label || "Learner"}
            profile={profile}
            onOpenRecommendations={() => setTab("recommendations")}
          />
        ) : tab === "strengths" ? (
          <StrengthsGapsTab />
        ) : tab === "mastery" ? (
          <MasteryMapTab />
        ) : tab === "recommendations" ? (
          <NovaRecommendsTab />
        ) : tab === "progress" ? (
          <ProgressTab />
        ) : (
          <ParentReportTab />
        )}
      </section>
    </main>
  );
}
