"use client";

import { useState } from "react";
import type { BankAccountSnapshot, BankScreenMode, MyMoneyTab } from "../lib/bank-types";
import BankOverview from "./BankOverview";
import BondsPanel from "./BondsPanel";
import MyMoneyTrendChart from "./MyMoneyTrendChart";
import SavingsGoalsPanel from "./SavingsGoalsPanel";
import StatementPanel from "./StatementPanel";
import WalletPanel from "./WalletPanel";

const MONEY_TABS: Array<{ id: MyMoneyTab; label: string; icon: string; description: string }> = [
  { id: "wallet", label: "Wallet", icon: "✦", description: "Available DT and money overview" },
  { id: "savings", label: "Savings Goals", icon: "◎", description: "Set DT aside for a purpose" },
  { id: "bonds", label: "Bank Bonds", icon: "◆", description: "Fixed-term Dreamscape Bonds" },
  { id: "statement", label: "Statement", icon: "≡", description: "Review your DT history" },
];

export default function MyMoneyPanel({
  account,
  loading,
  isLoggedIn,
  screenMode,
  hasMiloFinanceAccess,
  accessLoading,
  onOpenUpgrade,
}: {
  account: BankAccountSnapshot;
  loading: boolean;
  isLoggedIn: boolean;
  screenMode: BankScreenMode;
  hasMiloFinanceAccess: boolean;
  accessLoading: boolean;
  onOpenUpgrade: () => void;
}) {
  const isMobile = screenMode === "mobile";
  const isDesktop = screenMode === "desktop";
  const [activeTab, setActiveTab] = useState<MyMoneyTab>("wallet");

  return (
    <div style={{ marginTop: "8px" }}>
      <nav
        aria-label="My Money sections"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0,1fr))",
          gap: isMobile ? "5px" : "8px",
          padding: isMobile ? "5px" : "7px",
          borderRadius: "18px",
          border: "1px solid rgba(126,232,255,0.10)",
          background: "rgba(3,12,29,0.68)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {MONEY_TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={active}
              title={tab.description}
              style={{
                minHeight: isMobile ? "50px" : "54px",
                padding: isMobile ? "6px 3px" : "0 12px",
                borderRadius: "13px",
                border: active ? "1px solid rgba(159,255,210,0.34)" : "1px solid transparent",
                background: active ? "rgba(93,255,181,0.075)" : "transparent",
                color: active ? "white" : "rgba(255,255,255,0.50)",
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: isMobile ? "3px" : "7px",
                flexDirection: isMobile ? "column" : "row",
                fontSize: isMobile ? "9px" : "11px",
                fontWeight: 900,
              }}
            >
              <span aria-hidden="true" style={{ color: active ? "#9fffd2" : "inherit" }}>{tab.icon}</span>
              <span>{isMobile && tab.id === "savings" ? "Savings" : isMobile && tab.id === "bonds" ? "Bonds" : tab.label}</span>
            </button>
          );
        })}
      </nav>

      {activeTab === "wallet" && (
        <>
          <div
            style={{
              marginTop: "14px",
              display: "grid",
              gridTemplateColumns: isDesktop
                ? "minmax(0,0.88fr) minmax(0,1.12fr)"
                : "1fr",
              gap: "14px",
              alignItems: "stretch",
            }}
          >
            <BankOverview account={account} loading={loading} screenMode={screenMode} />
            <MyMoneyTrendChart
              account={account}
              isLoggedIn={isLoggedIn}
              screenMode={screenMode}
            />
          </div>

          <WalletPanel
            account={account}
            loading={loading}
            isLoggedIn={isLoggedIn}
            screenMode={screenMode}
          />
        </>
      )}

      {activeTab === "savings" && (
        <SavingsGoalsPanel
          screenMode={screenMode}
          isLoggedIn={isLoggedIn}
          availableDt={account.available}
        />
      )}

      {activeTab === "bonds" && (
        <BondsPanel
          screenMode={screenMode}
          isLoggedIn={isLoggedIn}
          hasMiloFinanceAccess={hasMiloFinanceAccess}
          accessLoading={accessLoading}
          onOpenUpgrade={onOpenUpgrade}
        />
      )}

      {activeTab === "statement" && (
        <StatementPanel
          account={account}
          loading={loading}
          isLoggedIn={isLoggedIn}
          screenMode={screenMode}
        />
      )}
    </div>
  );
}
