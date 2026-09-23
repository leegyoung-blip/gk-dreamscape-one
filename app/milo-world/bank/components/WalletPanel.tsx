"use client";

import { useState } from "react";
import type { BankAccountSnapshot, BankScreenMode } from "../lib/bank-types";
import TokenPurchaseModal from "./TokenPurchaseModal";
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
  const [topUpOpen, setTopUpOpen] = useState(false);

  const monthStats = [
    {
      label: "Earned",
      value: account.monthEarned,
      prefix: "+",
      tone: "#9fffd2",
      note: "Games & rewards",
    },
    {
      label: "Purchased",
      value: account.monthPurchased,
      prefix: "+",
      tone: "#b9d8ff",
      note: "DT top-ups",
    },
    {
      label: "Spent",
      value: account.monthSpent,
      prefix: "−",
      tone: "#ffc0a0",
      note: "Dreamscape use",
    },
    {
      label: "Balance change",
      value: Math.abs(account.monthNet),
      prefix: account.monthNet >= 0 ? "+" : "−",
      tone: account.monthNet >= 0 ? "#9fffd2" : "#ffc0a0",
      note: "Net this month",
    },
  ];

  return (
    <div style={{ marginTop: "18px", display: "grid", gap: "18px" }}>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1.18fr 0.82fr",
          gap: "14px",
        }}
      >
        <div
          style={{
            minHeight: isMobile ? "230px" : "218px",
            borderRadius: "24px",
            border: "1px solid rgba(126,232,255,0.18)",
            background:
              "radial-gradient(circle at 15% 10%, rgba(83,215,255,0.14), transparent 34%), linear-gradient(145deg, rgba(8,29,51,0.9), rgba(6,11,29,0.94))",
            padding: isMobile ? "20px" : "27px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "#8ee8ff",
                  fontSize: "10px",
                  fontWeight: 900,
                  letterSpacing: "0.17em",
                  textTransform: "uppercase",
                }}
              >
                Available Balance
              </p>
              <strong
                style={{
                  display: "block",
                  marginTop: "10px",
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: isMobile ? "44px" : "54px",
                  lineHeight: 1,
                  fontWeight: 500,
                  letterSpacing: "-0.045em",
                }}
              >
                {loading ? "—" : formatDt(account.available)}
              </strong>
            </div>

            <span
              style={{
                minHeight: "31px",
                padding: "0 11px",
                borderRadius: "999px",
                border: "1px solid rgba(126,232,255,0.16)",
                background: "rgba(83,215,255,0.06)",
                color: isLoggedIn ? "#9fffd2" : "#ffd18a",
                display: "inline-flex",
                alignItems: "center",
                fontSize: "9px",
                fontWeight: 900,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {isLoggedIn ? "Wallet connected" : "Login required"}
            </span>
          </div>

          <p
            style={{
              margin: "15px 0 0",
              maxWidth: "600px",
              color: "rgba(255,255,255,0.56)",
              fontSize: "13px",
              lineHeight: 1.55,
            }}
          >
            DT available to use across Dreamscape. Savings and bond balances will
            move into their own sections when those systems launch.
          </p>

          <div
            style={{
              marginTop: "auto",
              paddingTop: "21px",
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => setTopUpOpen(true)}
              style={{
                minHeight: "48px",
                padding: "0 20px",
                borderRadius: "14px",
                border: "1px solid rgba(126,232,255,0.48)",
                background:
                  "linear-gradient(135deg, rgba(83,215,255,0.22), rgba(92,91,223,0.26))",
                color: "white",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "11px",
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
              }}
            >
              + Add Dream Tokens
            </button>

            <span
              style={{
                minHeight: "48px",
                padding: "0 15px",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.035)",
                color: "rgba(255,255,255,0.46)",
                display: "inline-flex",
                alignItems: "center",
                fontSize: "10px",
                lineHeight: 1.4,
              }}
            >
              DT are in-platform credits and cannot be withdrawn as cash.
            </span>
          </div>
        </div>

        <div
          style={{
            borderRadius: "24px",
            border: "1px solid rgba(126,232,255,0.13)",
            background: "rgba(255,255,255,0.035)",
            padding: isMobile ? "18px" : "22px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
            <div>
              <p
                style={{
                  margin: 0,
                  color: "rgba(255,255,255,0.52)",
                  fontSize: "10px",
                  fontWeight: 900,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                This month
              </p>
              <h3 style={{ margin: "7px 0 0", fontSize: "22px", lineHeight: 1 }}>
                Wallet movement
              </h3>
            </div>
          </div>

          <div style={{ marginTop: "17px", display: "grid", gap: "9px" }}>
            {monthStats.map((stat) => (
              <div
                key={stat.label}
                style={{
                  minHeight: "47px",
                  display: "grid",
                  gridTemplateColumns: "minmax(0,1fr) auto",
                  alignItems: "center",
                  gap: "12px",
                  padding: "8px 10px",
                  borderRadius: "12px",
                  background: "rgba(3,12,29,0.38)",
                  border: "1px solid rgba(255,255,255,0.055)",
                }}
              >
                <span style={{ minWidth: 0 }}>
                  <strong style={{ display: "block", color: "rgba(255,255,255,0.78)", fontSize: "11px" }}>
                    {stat.label}
                  </strong>
                  <small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.34)", fontSize: "9px" }}>
                    {stat.note}
                  </small>
                </span>
                <strong style={{ color: stat.tone, fontSize: "12px", whiteSpace: "nowrap" }}>
                  {loading
                    ? "—"
                    : `${stat.prefix}${Math.round(stat.value).toLocaleString("en-SG")} DT`}
                </strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TransactionHistory
        transactions={account.transactions}
        loading={loading}
        isLoggedIn={isLoggedIn}
        screenMode={screenMode}
      />

      <TokenPurchaseModal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        screenMode={screenMode}
      />
    </div>
  );
}
