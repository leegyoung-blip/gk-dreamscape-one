"use client";

import Link from "next/link";
import type { BankScreenMode, BankTransaction } from "../lib/bank-types";

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function TransactionHistory({
  transactions,
  loading,
  isLoggedIn,
  screenMode,
}: {
  transactions: BankTransaction[];
  loading: boolean;
  isLoggedIn: boolean;
  screenMode: BankScreenMode;
}) {
  const isMobile = screenMode === "mobile";

  return (
    <section
      style={{
        borderRadius: "22px",
        border: "1px solid rgba(126,232,255,0.13)",
        background: "rgba(255,255,255,0.035)",
        padding: isMobile ? "18px" : "22px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "end" }}>
        <div>
          <p
            style={{
              margin: 0,
              color: "#8ee8ff",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            Statement
          </p>
          <h3 style={{ margin: "7px 0 0", fontSize: isMobile ? "24px" : "28px", lineHeight: 1 }}>
            Recent activity
          </h3>
        </div>
      </div>

      <div style={{ marginTop: "18px", display: "grid", gap: "8px" }}>
        {loading ? (
          <div style={{ padding: "24px", textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>
            Loading transactions…
          </div>
        ) : !isLoggedIn ? (
          <Link
            href="/login"
            style={{
              minHeight: "52px",
              borderRadius: "14px",
              border: "1px solid rgba(126,232,255,0.22)",
              background: "rgba(83,215,255,0.07)",
              color: "white",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: 850,
            }}
          >
            Log in to view your bank activity
          </Link>
        ) : transactions.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>
            No Dream Token transactions yet.
          </div>
        ) : (
          transactions.map((transaction) => {
            const positive = transaction.amount >= 0;

            return (
              <div
                key={transaction.id}
                style={{
                  minHeight: "58px",
                  borderRadius: "14px",
                  border: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(3,12,29,0.42)",
                  display: "grid",
                  gridTemplateColumns: "34px minmax(0,1fr) auto",
                  gap: "10px",
                  alignItems: "center",
                  padding: "10px 12px",
                }}
              >
                <span
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "11px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: positive
                      ? "1px solid rgba(93,255,181,0.28)"
                      : "1px solid rgba(255,167,120,0.28)",
                    background: positive ? "rgba(93,255,181,0.08)" : "rgba(255,138,92,0.08)",
                    color: positive ? "#9fffd2" : "#ffc0a0",
                    fontWeight: 950,
                  }}
                >
                  {positive ? "+" : "−"}
                </span>

                <span style={{ minWidth: 0 }}>
                  <strong
                    style={{
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: "12px",
                    }}
                  >
                    {transaction.title || (positive ? "Dream Token reward" : "Dream Token spend")}
                  </strong>
                  <small style={{ display: "block", marginTop: "4px", color: "rgba(255,255,255,0.4)", fontSize: "10px" }}>
                    {formatDate(transaction.createdAt)}
                  </small>
                </span>

                <strong style={{ color: positive ? "#9fffd2" : "#ffc0a0", fontSize: "12px", whiteSpace: "nowrap" }}>
                  {positive ? "+" : ""}
                  {Math.round(transaction.amount).toLocaleString("en-SG")} DT
                </strong>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
