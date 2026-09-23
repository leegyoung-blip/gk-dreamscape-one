"use client";

import { useState } from "react";
import BankFeaturePlaceholder from "./components/BankFeaturePlaceholder";
import BankHeader from "./components/BankHeader";
import BankNavigation from "./components/BankNavigation";
import BankOverview from "./components/BankOverview";
import WalletPanel from "./components/WalletPanel";
import SavingsGoalsPanel from "./components/SavingsGoalsPanel";
import { useBankAccount } from "./hooks/useBankAccount";
import { useBankResponsive } from "./hooks/useBankResponsive";
import type { BankTab } from "./lib/bank-types";

export default function MiloBankPage() {
  const screenMode = useBankResponsive();
  const isMobile = screenMode === "mobile";
  const [activeTab, setActiveTab] = useState<BankTab>("wallet");
  const { account, loading, isLoggedIn } = useBankAccount();

  return (
    <main
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100dvh",
        overflowX: "hidden",
        background:
          "radial-gradient(circle at 50% -10%, rgba(61,171,211,0.18), transparent 34%), radial-gradient(circle at 88% 18%, rgba(121,84,220,0.13), transparent 30%), linear-gradient(180deg, #06101d 0%, #020813 52%, #030713 100%)",
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
          pointerEvents: "none",
          boxShadow: "inset 0 0 190px rgba(0,0,0,0.58)",
        }}
      />

      <BankHeader
        screenMode={screenMode}
        available={account.available}
        loading={loading}
      />

      <section
        style={{
          position: "relative",
          zIndex: 2,
          width: "min(1180px, calc(100% - 28px))",
          margin: "0 auto",
          padding: isMobile ? "26px 0 70px" : "42px 0 90px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: isMobile ? "28px" : "34px" }}>
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
            Milo’s World · Financial Hub
          </p>

          <h1
            style={{
              margin: "11px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "clamp(48px, 15vw, 66px)" : "clamp(66px, 7vw, 92px)",
              lineHeight: 0.92,
              fontWeight: 400,
              letterSpacing: "-0.055em",
              textShadow: "0 24px 70px rgba(0,0,0,0.46)",
            }}
          >
            Milo’s Bank
          </h1>

          <p
            style={{
              margin: "15px auto 0",
              color: "rgba(255,255,255,0.58)",
              fontSize: isMobile ? "13px" : "15px",
              lineHeight: 1.6,
            }}
          >
            Save. Plan. Grow.
          </p>
        </div>

        <BankOverview
          account={account}
          loading={loading}
          screenMode={screenMode}
        />

        <BankNavigation
          activeTab={activeTab}
          onChange={setActiveTab}
          screenMode={screenMode}
        />

        {activeTab === "wallet" && (
          <WalletPanel
            account={account}
            loading={loading}
            isLoggedIn={isLoggedIn}
            screenMode={screenMode}
          />
        )}

        {activeTab === "savings" && (
          <SavingsGoalsPanel
            screenMode={screenMode}
            isLoggedIn={isLoggedIn}
            availableDt={account.available}
          />
        )}

        {activeTab === "bonds" && (
          <BankFeaturePlaceholder feature="bonds" screenMode={screenMode} />
        )}

        {activeTab === "learn" && (
          <BankFeaturePlaceholder feature="learn" screenMode={screenMode} />
        )}
      </section>
    </main>
  );
}
