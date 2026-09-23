"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MyLearningTab from "@/components/nova-plus/tabs/MyLearningTab";
import StrengthsGapsTab from "@/components/nova-plus/tabs/StrengthsGapsTab";
import MasteryMapTab from "@/components/nova-plus/tabs/MasteryMapTab";
import NovaRecommendsTab from "@/components/nova-plus/tabs/NovaRecommendsTab";
import ProgressTab from "@/components/nova-plus/tabs/ProgressTab";
import ParentReportTab from "@/components/nova-plus/tabs/ParentReportTab";
import NovaSchoolworkUploader from "@/components/nova-plus/NovaSchoolworkUploader";
import NovaSchoolworkHistory from "@/components/nova-plus/NovaSchoolworkHistory";
import NovaPlusGuide, {
  NOVA_PLUS_GUIDE_STEPS,
} from "@/components/nova-plus/NovaPlusGuide";
import { useNovaPlusProfile } from "@/hooks/useNovaPlusProfile";
import { useNovaSchoolworkEvidence } from "@/hooks/useNovaSchoolworkEvidence";
import { supabase } from "@/lib/supabase";
import type { NovaPlusTab } from "@/lib/nova-plus/types";
import styles from "./NovaPlusDashboard.module.css";
import actionStyles from "./NovaPlusHeaderActions.module.css";

const GUIDE_METADATA_KEY = "nova_plus_guide_seen_v1";

const TABS: Array<{ key: NovaPlusTab; label: string; icon: string }> = [
  { key: "learning", label: "My Learning", icon: "◎" },
  { key: "strengths", label: "Strengths & Gaps", icon: "✦" },
  { key: "mastery", label: "Mastery Map", icon: "⌘" },
  { key: "recommendations", label: "Nova Recommends", icon: "→" },
  { key: "progress", label: "Progress", icon: "↗" },
  { key: "parent", label: "Parent Report", icon: "◇" },
];

export default function NovaPlusDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedLearnerId = searchParams.get("student");
  const [tab, setTab] = useState<NovaPlusTab>("learning");
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [schoolworkOpen, setSchoolworkOpen] = useState(false);
  const [schoolworkHistoryOpen, setSchoolworkHistoryOpen] = useState(false);
  const [resumeSchoolworkId, setResumeSchoolworkId] = useState<string | null>(null);
  const [historyFocusUploadId, setHistoryFocusUploadId] =
    useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [firstGuidePending, setFirstGuidePending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadViewer() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      setViewerId(user?.id ?? null);

      if (!user || typeof window === "undefined") return;

      const localKey = `${GUIDE_METADATA_KEY}:${user.id}`;
      const metadataSeen = Boolean(user.user_metadata?.[GUIDE_METADATA_KEY]);
      const localSeen = window.localStorage.getItem(localKey) === "1";

      if (!metadataSeen && !localSeen) {
        setFirstGuidePending(true);
      }
    }

    void loadViewer();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const accountName = useMemo(() => {
    const label = selectedLearner?.label?.trim();
    return label || "Account";
  }, [selectedLearner?.label]);

  const schoolworkEvidence = useNovaSchoolworkEvidence(selectedLearnerId);

  useEffect(() => {
    if (!firstGuidePending || !viewerId || !selectedLearnerId || !profile) return;

    setGuideStep(0);
    setGuideOpen(true);
    setFirstGuidePending(false);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(`${GUIDE_METADATA_KEY}:${viewerId}`, "1");
    }

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || user.user_metadata?.[GUIDE_METADATA_KEY]) return;

      const { error: guideError } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          [GUIDE_METADATA_KEY]: true,
        },
      });

      if (guideError) {
        // localStorage still prevents the guide repeatedly opening on this device.
        console.info("Could not persist NOVA+ guide completion to auth metadata:", guideError.message);
      }
    })();
  }, [firstGuidePending, viewerId, selectedLearnerId, profile]);

  const currentGuideStep = NOVA_PLUS_GUIDE_STEPS[guideStep];

  function openGuide() {
    setGuideStep(0);
    setGuideOpen(true);
  }

  function closeNovaPlus() {
    router.push("/learning-missions/progress-rewards");
  }

  function openAddWork() {
    setResumeSchoolworkId(null);
    setSchoolworkOpen(true);
  }

  return (
    <main
      className={styles.page}
      style={{
        width: "100%",
        maxWidth: "none",
        marginLeft: 0,
        marginRight: 0,
      }}
    >
      <div className={styles.grid} aria-hidden="true" />

      <section
        className={styles.hero}
        style={{
          width: "100%",
          maxWidth: "none",
          marginLeft: 0,
          marginRight: 0,
        }}
      >
        <div className={styles.heroCopy}>
          <div className={styles.brandLine}>
            <span className={styles.kicker}>NOVA+</span>
          </div>

          <h1>Learning Intelligence</h1>
          <p>
            A clear view of {accountName}&apos;s strengths, learning gaps and what
            to focus on next.
          </p>

          {learners.length > 1 && (
            <label className={styles.learnerPicker}>
              <span>Account</span>
              <select
                value={selectedLearnerId ?? ""}
                onChange={(event) => void selectLearner(event.target.value)}
              >
                {learners.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className={styles.heroVisual} aria-hidden="true">
          <div className={`${styles.orbit} ${styles.orbitOuter}`} />
          <div className={`${styles.orbit} ${styles.orbitInner}`} />
          <div className={styles.novaCore}>
            <img src="/nova/nova-character.png" alt="" />
          </div>
        </div>

        <div className={styles.heroActions}>
          <button
            type="button"
            className={`${actionStyles.addWorkButton} ${
              guideOpen && currentGuideStep?.target === "add-work"
                ? actionStyles.guideTarget
                : ""
            }`}
            disabled={loading || !selectedLearnerId}
            onClick={openAddWork}
          >
            <span className={actionStyles.addWorkIcon}>＋</span>
            <span className={actionStyles.addWorkCopy}>
              <strong>Add Work</strong>
              <small>Upload schoolwork</small>
            </span>
          </button>

          <button
            type="button"
            className={actionStyles.guideButton}
            onClick={openGuide}
            aria-expanded={guideOpen}
          >
            <span>✦</span> Guide
          </button>

          <button
            type="button"
            className={styles.refreshButton}
            disabled={loading || !selectedLearnerId}
            onClick={() => setSchoolworkHistoryOpen(true)}
          >
            Work History
            {schoolworkEvidence.awaiting_review > 0
              ? ` · ${schoolworkEvidence.awaiting_review}`
              : ""}
          </button>

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
      </section>

      <nav
        className={styles.tabs}
        aria-label="NOVA+ sections"
        style={{
          width: "100%",
          maxWidth: "none",
          marginLeft: 0,
          marginRight: 0,
        }}
      >
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`${tab === item.key ? styles.activeTab : ""} ${
              guideOpen && currentGuideStep?.tab === item.key
                ? actionStyles.guideTabTarget
                : ""
            }`}
            onClick={() => setTab(item.key)}
          >
            <span>{item.icon}</span>
            <strong>{item.label}</strong>
          </button>
        ))}
      </nav>

      <section
        className={styles.content}
        style={{
          width: "100%",
          maxWidth: "none",
          marginLeft: 0,
          marginRight: 0,
        }}
      >
        {loading && !profile ? (
          <div className={styles.stateCard}>
            <span className={styles.spinner} />
            <strong>Building the learning picture…</strong>
            <p>Nova is loading this account&apos;s persistent learning profile.</p>
          </div>
        ) : error && !profile ? (
          <div className={styles.stateCard}>
            <div className={styles.lockIcon}>N+</div>
            <strong>NOVA+ could not load</strong>
            <p>{error}</p>
            <button type="button" onClick={closeNovaPlus}>
              Return to Progress & Rewards
            </button>
          </div>
        ) : !profile || !selectedLearnerId ? (
          <div className={styles.stateCard}>
            <strong>No NOVA+ profile is available for this account yet.</strong>
          </div>
        ) : tab === "learning" ? (
          <MyLearningTab
            learnerId={selectedLearnerId}
            learnerLabel={accountName}
            profile={profile}
            onOpenRecommendations={() => setTab("recommendations")}
          />
        ) : tab === "strengths" ? (
          <StrengthsGapsTab
            learnerId={selectedLearnerId}
            accountName={accountName}
            profile={profile}
            onOpenRecommendations={() => setTab("recommendations")}
          />
        ) : tab === "mastery" ? (
          <MasteryMapTab
            learnerId={selectedLearnerId}
            accountName={accountName}
            profile={profile}
            onOpenRecommendations={() => setTab("recommendations")}
          />
        ) : tab === "recommendations" ? (
          <NovaRecommendsTab
            learnerId={selectedLearnerId}
            learnerLabel={accountName}
            canLaunchPractice={Boolean(viewerId && viewerId === selectedLearnerId)}
            isAdminPreview={isAdminPreview}
          />
        ) : tab === "progress" ? (
          <ProgressTab
            profile={profile}
            learnerLabel={accountName}
            onOpenRecommendations={() => setTab("recommendations")}
          />
        ) : (
          <ParentReportTab
            profile={profile}
            learnerId={selectedLearnerId}
            learnerLabel={accountName}
            onOpenRecommendations={() => setTab("recommendations")}
          />
        )}
      </section>

      <NovaPlusGuide
        open={guideOpen}
        accountName={accountName}
        stepIndex={guideStep}
        onStepChange={setGuideStep}
        onSelectTab={setTab}
        onClose={() => setGuideOpen(false)}
      />

      {selectedLearnerId && (
        <>
          <NovaSchoolworkUploader
            open={schoolworkOpen}
            learnerId={selectedLearnerId}
            learnerLabel={accountName}
            resumeUploadId={resumeSchoolworkId}
            onResumeHandled={() => setResumeSchoolworkId(null)}
            onViewExistingUpload={(uploadId) => {
              setSchoolworkOpen(false);
              setHistoryFocusUploadId(uploadId);
              setSchoolworkHistoryOpen(true);
            }}
            onClose={() => {
              setSchoolworkOpen(false);
              setResumeSchoolworkId(null);
            }}
            onCommitted={() => refresh()}
          />

          <NovaSchoolworkHistory
            open={schoolworkHistoryOpen}
            learnerId={selectedLearnerId}
            learnerLabel={accountName}
            initialUploadId={historyFocusUploadId}
            onInitialUploadHandled={() => setHistoryFocusUploadId(null)}
            onClose={() => {
              setSchoolworkHistoryOpen(false);
              setHistoryFocusUploadId(null);
            }}
            onContinueReview={(uploadId) => {
              setSchoolworkHistoryOpen(false);
              setResumeSchoolworkId(uploadId);
              setSchoolworkOpen(true);
            }}
            onChanged={() => refresh()}
          />
        </>
      )}
    </main>
  );
}
