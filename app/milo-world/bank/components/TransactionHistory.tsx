"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  BankScreenMode,
  BankTransaction,
  BankTransactionCategory,
} from "../lib/bank-types";
import {
  categoryLabel,
  transactionFallbackTitle,
} from "../lib/transaction-utils";

type StatementFilter = "all" | BankTransactionCategory;

const FILTERS: { key: StatementFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "earned", label: "Earned" },
  { key: "purchased", label: "Purchased" },
  { key: "spent", label: "Spent" },
  { key: "other", label: "Other" },
];

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function categoryPresentation(category: BankTransactionCategory) {
  switch (category) {
    case "earned":
      return {
        icon: "↗",
        tone: "#9fffd2",
        border: "rgba(93,255,181,0.28)",
        background: "rgba(93,255,181,0.08)",
      };
    case "purchased":
      return {
        icon: "+",
        tone: "#b9d8ff",
        border: "rgba(133,187,255,0.3)",
        background: "rgba(104,159,255,0.09)",
      };
    case "spent":
      return {
        icon: "↘",
        tone: "#ffc0a0",
        border: "rgba(255,167,120,0.28)",
        background: "rgba(255,138,92,0.08)",
      };
    default:
      return {
        icon: "•",
        tone: "#d7dbe7",
        border: "rgba(255,255,255,0.16)",
        background: "rgba(255,255,255,0.055)",
      };
  }
}

function escapeCsv(value: string | number) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function exportStatement(transactions: BankTransaction[]) {
  if (transactions.length === 0) return;

  const rows = [
    ["Date", "Category", "Description", "Type", "Amount (DT)"],
    ...transactions.map((transaction) => [
      formatDate(transaction.createdAt),
      categoryLabel(transaction.category),
      transaction.title || transactionFallbackTitle(transaction),
      transaction.type || "",
      transaction.amount,
    ]),
  ];

  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `milo-bank-statement-${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
  const [activeFilter, setActiveFilter] = useState<StatementFilter>("all");
  const [expanded, setExpanded] = useState(false);

  const categoryCounts = useMemo(() => {
    const counts: Record<BankTransactionCategory, number> = {
      earned: 0,
      purchased: 0,
      spent: 0,
      other: 0,
    };

    transactions.forEach((transaction) => {
      counts[transaction.category] += 1;
    });

    return counts;
  }, [transactions]);

  const filteredTransactions = useMemo(
    () =>
      activeFilter === "all"
        ? transactions
        : transactions.filter(
            (transaction) => transaction.category === activeFilter,
          ),
    [activeFilter, transactions],
  );

  const visibleTransactions = expanded
    ? filteredTransactions
    : filteredTransactions.slice(0, 10);

  const hiddenCount = Math.max(
    filteredTransactions.length - visibleTransactions.length,
    0,
  );

  return (
    <section
      style={{
        borderRadius: "24px",
        border: "1px solid rgba(126,232,255,0.13)",
        background: "rgba(255,255,255,0.035)",
        padding: isMobile ? "18px" : "23px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          alignItems: "flex-start",
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
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            Bank Statement
          </p>
          <h3
            style={{
              margin: "7px 0 0",
              fontSize: isMobile ? "25px" : "30px",
              lineHeight: 1,
            }}
          >
            Wallet activity
          </h3>
          <p
            style={{
              margin: "9px 0 0",
              color: "rgba(255,255,255,0.44)",
              fontSize: "11px",
              lineHeight: 1.5,
            }}
          >
            Latest {transactions.length.toLocaleString("en-SG")} recorded entries.
            Purchases are separated from earned DT where the transaction metadata
            identifies a top-up.
          </p>
        </div>

        {isLoggedIn && transactions.length > 0 && (
          <button
            type="button"
            onClick={() => exportStatement(transactions)}
            style={{
              minHeight: "38px",
              padding: "0 13px",
              borderRadius: "12px",
              border: "1px solid rgba(126,232,255,0.18)",
              background: "rgba(83,215,255,0.055)",
              color: "#bdf6ff",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Export CSV
          </button>
        )}
      </div>

      {isLoggedIn && transactions.length > 0 && (
        <div
          style={{
            marginTop: "18px",
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            paddingBottom: "2px",
          }}
        >
          {FILTERS.map((filter) => {
            const count =
              filter.key === "all"
                ? transactions.length
                : categoryCounts[filter.key];
            const active = activeFilter === filter.key;

            if (filter.key === "other" && count === 0) return null;

            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => {
                  setActiveFilter(filter.key);
                  setExpanded(false);
                }}
                style={{
                  minHeight: "36px",
                  padding: "0 12px",
                  borderRadius: "999px",
                  border: active
                    ? "1px solid rgba(142,232,255,0.62)"
                    : "1px solid rgba(255,255,255,0.09)",
                  background: active
                    ? "rgba(83,215,255,0.12)"
                    : "rgba(255,255,255,0.035)",
                  color: active ? "white" : "rgba(255,255,255,0.58)",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "10px",
                  fontWeight: 850,
                }}
              >
                {filter.label} · {count}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: "16px", display: "grid", gap: "8px" }}>
        {loading ? (
          <div
            style={{
              padding: "28px",
              textAlign: "center",
              color: "rgba(255,255,255,0.5)",
              fontSize: "13px",
            }}
          >
            Loading statement…
          </div>
        ) : !isLoggedIn ? (
          <Link
            href="/login"
            style={{
              minHeight: "54px",
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
            Log in to view your bank statement
          </Link>
        ) : transactions.length === 0 ? (
          <div
            style={{
              padding: "28px",
              textAlign: "center",
              color: "rgba(255,255,255,0.5)",
              fontSize: "13px",
            }}
          >
            No Dream Token transactions yet.
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div
            style={{
              padding: "28px",
              textAlign: "center",
              color: "rgba(255,255,255,0.5)",
              fontSize: "13px",
            }}
          >
            No transactions in this category.
          </div>
        ) : (
          visibleTransactions.map((transaction) => {
            const presentation = categoryPresentation(transaction.category);
            const positive = transaction.amount >= 0;

            return (
              <div
                key={transaction.id}
                style={{
                  minHeight: isMobile ? "66px" : "62px",
                  borderRadius: "14px",
                  border: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(3,12,29,0.42)",
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "34px minmax(0,1fr)"
                    : "34px minmax(0,1fr) auto",
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
                    border: `1px solid ${presentation.border}`,
                    background: presentation.background,
                    color: presentation.tone,
                    fontWeight: 950,
                  }}
                >
                  {presentation.icon}
                </span>

                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                      flexWrap: "wrap",
                    }}
                  >
                    <strong
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: "12px",
                        maxWidth: "100%",
                      }}
                    >
                      {transaction.title || transactionFallbackTitle(transaction)}
                    </strong>
                    <small
                      style={{
                        padding: "3px 6px",
                        borderRadius: "999px",
                        background: presentation.background,
                        color: presentation.tone,
                        fontSize: "8px",
                        fontWeight: 900,
                        letterSpacing: "0.07em",
                        textTransform: "uppercase",
                      }}
                    >
                      {categoryLabel(transaction.category)}
                    </small>
                  </span>
                  <small
                    style={{
                      display: "block",
                      marginTop: "5px",
                      color: "rgba(255,255,255,0.38)",
                      fontSize: "9px",
                    }}
                  >
                    {formatDate(transaction.createdAt)}
                    {transaction.type ? ` · ${transaction.type}` : ""}
                  </small>

                  {isMobile && (
                    <strong
                      style={{
                        display: "block",
                        marginTop: "6px",
                        color: presentation.tone,
                        fontSize: "12px",
                      }}
                    >
                      {positive ? "+" : ""}
                      {Math.round(transaction.amount).toLocaleString("en-SG")} DT
                    </strong>
                  )}
                </span>

                {!isMobile && (
                  <strong
                    style={{
                      color: presentation.tone,
                      fontSize: "12px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {positive ? "+" : ""}
                    {Math.round(transaction.amount).toLocaleString("en-SG")} DT
                  </strong>
                )}
              </div>
            );
          })
        )}
      </div>

      {!loading &&
        isLoggedIn &&
        filteredTransactions.length > 10 && (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            style={{
              marginTop: "14px",
              width: "100%",
              minHeight: "44px",
              borderRadius: "13px",
              border: "1px solid rgba(126,232,255,0.13)",
              background: "rgba(83,215,255,0.045)",
              color: "#bdf6ff",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            {expanded ? "Show latest 10" : `Show ${hiddenCount} more entries`}
          </button>
        )}
    </section>
  );
}
