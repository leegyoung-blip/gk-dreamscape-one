"use client";

import type { BankAccountSnapshot, BankScreenMode } from "../lib/bank-types";
import TransactionHistory from "./TransactionHistory";

export default function StatementPanel({
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

  return (
    <div style={{ marginTop: "18px" }}>
      <section
        style={{
          borderRadius: isMobile ? "22px" : "24px",
          border: "1px solid rgba(126,232,255,0.13)",
          background: "linear-gradient(145deg, rgba(7,25,47,0.80), rgba(5,10,27,0.90))",
          padding: isMobile ? "18px" : "22px 24px",
          marginBottom: "14px",
        }}
      >
        <p style={{ margin: 0, color: "#8ee8ff", fontSize: "9px", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase" }}>
          My Money · Statement
        </p>
        <h2 style={{ margin: "7px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "32px" : "38px", lineHeight: 1, fontWeight: 500 }}>
          Follow where your DT moves.
        </h2>
        <p style={{ margin: "11px 0 0", maxWidth: "700px", color: "rgba(255,255,255,0.52)", fontSize: "12px", lineHeight: 1.6 }}>
          Review earned, purchased and spent Dream Tokens in one place. Use the filters to understand how your balance changes over time.
        </p>
      </section>

      <TransactionHistory
        transactions={account.transactions}
        loading={loading}
        isLoggedIn={isLoggedIn}
        screenMode={screenMode}
      />
    </div>
  );
}
