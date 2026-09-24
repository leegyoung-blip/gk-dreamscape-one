"use client";

import { useCallback, useEffect, useState } from "react";
import BankAchievementsModal from "./components/BankAchievementsModal";
import BankGuide, { hasSeenBankGuide } from "./components/BankGuide";
import BankHeader from "./components/BankHeader";
import BankHomeDashboard from "./components/BankHomeDashboard";
import BankNavigation from "./components/BankNavigation";
import LearnSection from "./components/LearnSection";
import MyMoneyPanel from "./components/MyMoneyPanel";
import PractiseSection from "./components/PractiseSection";
import ProgressSection from "./components/ProgressSection";
import { useBankAccount } from "./hooks/useBankAccount";
import { useBankAchievements } from "./hooks/useBankAchievements";
import { useBankResponsive } from "./hooks/useBankResponsive";
import { useFinancialProgress } from "./hooks/useFinancialProgress";
import { useMiloFinanceAccess } from "./hooks/useMiloFinanceAccess";
import MiloFinanceBadge from "./components/MiloFinanceBadge";
import MiloFinanceUpgradeModal from "./components/MiloFinanceUpgradeModal";
import type { BankSection } from "./lib/bank-types";

export default function MiloBankPage() {
  const screenMode = useBankResponsive();
  const isMobile = screenMode === "mobile";
  const [activeSection, setActiveSection] = useState<BankSection | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [financeUpgradeOpen, setFinanceUpgradeOpen] = useState(false);
  const { account, loading, isLoggedIn } = useBankAccount();
  const achievements = useBankAchievements(isLoggedIn);
  const financialProgress = useFinancialProgress(isLoggedIn);
  const financeAccess = useMiloFinanceAccess(isLoggedIn);

  useEffect(() => {
    if (!hasSeenBankGuide()) setGuideOpen(true);
  }, []);

  const openSection = useCallback((section: BankSection) => {
    setActiveSection(section);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }, []);

  return (
    <main
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100dvh",
        overflowX: "hidden",
        background: "#020813",
        color: "white",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage: 'url("/milo-world/bank/milos-bank-background.png")',
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
          filter: "saturate(0.92) brightness(0.72)",
          transform: "scale(1.01)",
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background:
            "linear-gradient(180deg, rgba(1,8,18,0.34) 0%, rgba(2,8,19,0.58) 42%, rgba(2,8,19,0.82) 72%, rgba(2,7,18,0.94) 100%)",
          boxShadow: "inset 0 0 210px rgba(0,0,0,0.62)",
        }}
      />

      <BankHeader
        screenMode={screenMode}
        available={account.available}
        loading={loading}
        onOpenGuide={() => setGuideOpen(true)}
        onOpenAchievements={() => setAchievementsOpen(true)}
      />

      <section
        style={{
          position: "relative",
          zIndex: 2,
          width: isMobile
            ? "min(1180px, calc(100% - 20px))"
            : "min(1180px, calc(100% - 28px))",
          margin: "0 auto",
          padding: isMobile ? "24px 0 70px" : "42px 0 90px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: isMobile ? "22px" : "28px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#8ee8ff",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            Milo’s World · Financial Learning Centre
          </p>

          <button
            type="button"
            onClick={() => setActiveSection(null)}
            aria-label="Return to Milo’s Bank overview"
            style={{
              display: "block",
              margin: "11px auto 0",
              padding: 0,
              border: 0,
              background: "transparent",
              color: "white",
              cursor: activeSection ? "pointer" : "default",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile
                ? "clamp(46px, 14vw, 64px)"
                : "clamp(66px, 7vw, 92px)",
              lineHeight: 0.92,
              fontWeight: 400,
              letterSpacing: "-0.055em",
              textShadow: "0 24px 70px rgba(0,0,0,0.46)",
            }}
          >
            Milo’s Bank
          </button>

          <p
            style={{
              margin: "15px auto 0",
              maxWidth: "740px",
              color: "rgba(255,255,255,0.58)",
              fontSize: isMobile ? "13px" : "15px",
              lineHeight: 1.6,
            }}
          >
            Learn how money works. Put it into practice. See how your decisions improve.
          </p>

          {!financeAccess.loading && (
            <div style={{ marginTop: "12px" }}>
              {financeAccess.hasAccess ? (
                <MiloFinanceBadge active />
              ) : (
                <button
                  type="button"
                  onClick={() => setFinanceUpgradeOpen(true)}
                  style={{
                    border: 0,
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
                  }}
                >
                  <MiloFinanceBadge />
                </button>
              )}
            </div>
          )}

          {activeSection && (
            <button
              type="button"
              onClick={() => setActiveSection(null)}
              style={{
                marginTop: "12px",
                minHeight: "34px",
                padding: "0 12px",
                borderRadius: "999px",
                border: "1px solid rgba(126,232,255,0.14)",
                background: "rgba(3,12,29,0.42)",
                color: "rgba(255,255,255,0.58)",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "9px",
                fontWeight: 850,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              ← Bank Overview
            </button>
          )}
        </div>

        <BankNavigation
          activeSection={activeSection}
          onChange={openSection}
          screenMode={screenMode}
        />

        {activeSection === null && (
          <BankHomeDashboard
            account={account}
            loading={loading}
            screenMode={screenMode}
            unlockedCount={achievements.unlockedCount}
            totalMilestones={achievements.totalCount}
            milestoneProgress={achievements.progressPercent}
            foundationCompleted={financialProgress.foundationCompleted}
            foundationTotal={financialProgress.foundationTotal}
            onOpenSection={openSection}
          />
        )}

        {activeSection === "learn" && (
          <LearnSection
            screenMode={screenMode}
            isLoggedIn={isLoggedIn}
            hasMiloFinanceAccess={financeAccess.hasAccess}
            accessLoading={financeAccess.loading}
            onOpenUpgrade={() => setFinanceUpgradeOpen(true)}
          />
        )}

        {activeSection === "practise" && (
          <PractiseSection
            screenMode={screenMode}
            hasMiloFinanceAccess={financeAccess.hasAccess}
            accessLoading={financeAccess.loading}
            onOpenUpgrade={() => setFinanceUpgradeOpen(true)}
          />
        )}

        {activeSection === "money" && (
          <MyMoneyPanel
            account={account}
            loading={loading}
            isLoggedIn={isLoggedIn}
            screenMode={screenMode}
            hasMiloFinanceAccess={financeAccess.hasAccess}
            accessLoading={financeAccess.loading}
            onOpenUpgrade={() => setFinanceUpgradeOpen(true)}
          />
        )}

        {activeSection === "progress" && (
          <ProgressSection
            screenMode={screenMode}
            unlockedCount={achievements.unlockedCount}
            totalCount={achievements.totalCount}
            progressPercent={achievements.progressPercent}
            milestonesLoading={achievements.loading}
            progress={financialProgress}
            progressLoading={financialProgress.loading}
            progressError={financialProgress.error}
            onRetryProgress={financialProgress.refresh}
            onOpenAchievements={() => setAchievementsOpen(true)}
            onOpenGuide={() => setGuideOpen(true)}
            hasMiloFinanceAccess={financeAccess.hasAccess}
            accessLoading={financeAccess.loading}
            onOpenUpgrade={() => setFinanceUpgradeOpen(true)}
          />
        )}
      </section>

      <BankGuide
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        onChangeSection={openSection}
        screenMode={screenMode}
      />


      <MiloFinanceUpgradeModal
        open={financeUpgradeOpen}
        onClose={() => setFinanceUpgradeOpen(false)}
        screenMode={screenMode}
      />

      <BankAchievementsModal
        open={achievementsOpen}
        onClose={() => setAchievementsOpen(false)}
        screenMode={screenMode}
        achievements={achievements.achievements}
        unlockedCount={achievements.unlockedCount}
        totalCount={achievements.totalCount}
        loading={achievements.loading}
        error={achievements.error}
        isLoggedIn={isLoggedIn}
        onRetry={achievements.refresh}
      />
    </main>
  );
}
