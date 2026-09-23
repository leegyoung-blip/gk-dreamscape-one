"use client";

import type { BankAccountSnapshot, BankScreenMode } from "../lib/bank-types";
import TokenPurchasePanel from "./TokenPurchasePanel";
import TransactionHistory from "./TransactionHistory";

function formatDt(value: number) {
  return `${Math.round(Number(value || 0)).toLocaleString("en-SG")} DT`;
}

export default function WalletPanel({
  account,
  loading,
  isLoggedIn,
  screenMode,
}: {
  account: BankAccountSnapshot;
  loading: boolean;
  isLoggedIn: boolean;
  screenMode: BankScreenMode;
}) {
  const isMobile = screenMode === "mobile";

  const monthStats = [
    { label: "Earned", value: account.monthEarned, prefix: "+", positive: true },
    { label: "Spent", value: account.monthSpent, prefix: "−", positive: false },
    {
      label: "Net",
      value: Math.abs(account.monthNet),
      prefix: account.monthNet >= 0 ? "+" : "−",
      positive: account.monthNet >= 0,
    },
  ];

  return (
    <div style={{ marginTop: "18px", display: "grid", gap: "18px" }}>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1.25fr 0.75fr",
          gap: "14px",
        }}
      >
        <div
          style={{
            minHeight: "190px",
            borderRadius: "24px",
            border: "1px solid rgba(126,232,255,0.15)",
            background:
              "linear-gradient(145deg, rgba(8,29,51,0.84), rgba(6,11,29,0.9))",
            padding: isMobile ? "20px" : "26px",
          }}
        >
          <p style={{ margin: 0, color: "#8ee8ff", fontSize: "10px", fontWeight: 900, letterSpacing: "0.17em", textTransform: "uppercase" }}>
            Available Balance
          </p>
          <strong
            style={{
              display: "block",
              marginTop: "10px",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "42px" : "52px",
              lineHeight: 1,
              fontWeight: 500,
              letterSpacing: "-0.045em",
            }}
          >
            {loading ? "—" : formatDt(account.available)}
          </strong>
          <p style={{ margin: "14px 0 0", maxWidth: "560px", color: "rgba(255,255,255,0.56)", fontSize: "13px", lineHeight: 1.55 }}>
            This is the DT currently available to use across Dreamscape. Savings and bond balances will be separated here when those systems are activated.
          </p>
        </div>

        <div
          style={{
            borderRadius: "24px",
            border: "1px solid rgba(126,232,255,0.13)",
            background: "rgba(255,255,255,0.035)",
            padding: isMobile ? "18px" : "22px",
          }}
        >
          <p style={{ margin: 0, color: "rgba(255,255,255,0.52)", fontSize: "10px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>
            This month
          </p>
          <div style={{ marginTop: "15px", display: "grid", gap: "10px" }}>
            {monthStats.map((stat) => (
              <div key={stat.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <span style={{ color: "rgba(255,255,255,0.62)", fontSize: "12px" }}>{stat.label}</span>
                <strong style={{ color: stat.positive ? "#9fffd2" : "#ffc0a0", fontSize: "13px" }}>
                  {loading ? "—" : `${stat.prefix}${Math.round(stat.value).toLocaleString("en-SG")} DT`}
                </strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TokenPurchasePanel />

      <TransactionHistory
        transactions={account.transactions}
        loading={loading}
        isLoggedIn={isLoggedIn}
        screenMode={screenMode}
      />
    </div>
  );
}
