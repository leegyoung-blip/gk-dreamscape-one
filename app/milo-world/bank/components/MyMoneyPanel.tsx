"use client";

import { useState } from "react";
import type { BankAccountSnapshot, BankScreenMode, MyMoneyTab } from "../lib/bank-types";
import BankOverview from "./BankOverview";
import BondsPanel from "./BondsPanel";
import SavingsGoalsPanel from "./SavingsGoalsPanel";
import StatementPanel from "./StatementPanel";
import WalletPanel from "./WalletPanel";

const MONEY_TABS: Array<{ id: MyMoneyTab; label: string; icon: string; description: string }> = [
  { id: "wallet", label: "Wallet", icon: "✦", description: "Available DT and monthly movement" },
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
  const [activeTab, setActiveTab] = useState<MyMoneyTab>("wallet");

  return (
    <div style={{ marginTop: "18px" }}>
      <section
        style={{
          marginBottom: "14px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p style={{ margin: 0, color: "#9fffd2", fontSize: "9px", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>
            Personal Finance
          </p>
          <h2 style={{ margin: "7px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "38px" : "48px", lineHeight: 0.98, fontWeight: 500, letterSpacing: "-0.035em" }}>
            My Money
          </h2>
          <p style={{ margin: "10px 0 0", maxWidth: "720px", color: "rgba(255,255,255,0.50)", fontSize: "12px", lineHeight: 1.6 }}>
            Your practical Bank tools live here. Manage available DT, set money aside, use Bank Bonds and review your statement.
          </p>
        </div>
      </section>

      <BankOverview account={account} loading={loading} screenMode={screenMode} />

      <nav
        aria-label="My Money sections"
        style={{
          marginTop: "12px",
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0,1fr))",
          gap: isMobile ? "5px" : "8px",
          padding: isMobile ? "5px" : "7px",
          borderRadius: "18px",
          border: "1px solid rgba(126,232,255,0.10)",
          background: "rgba(3,12,29,0.60)",
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
                minHeight: isMobile ? "52px" : "54px",
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
