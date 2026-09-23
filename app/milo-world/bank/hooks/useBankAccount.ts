"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { BankAccountSnapshot, BankTransaction } from "../lib/bank-types";
import { classifyBankTransaction } from "../lib/transaction-utils";

const EMPTY_ACCOUNT: BankAccountSnapshot = {
  available: 0,
  savings: 0,
  bonds: 0,
  interestEarned: 0,
  total: 0,
  monthEarned: 0,
  monthPurchased: 0,
  monthSpent: 0,
  monthNet: 0,
  transactions: [],
};

function startOfCurrentMonthIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export function useBankAccount() {
  const [account, setAccount] = useState<BankAccountSnapshot>(EMPTY_ACCOUNT);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const loadAccount = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsLoggedIn(false);
      setAccount(EMPTY_ACCOUNT);
      setLoading(false);
      return;
    }

    setIsLoggedIn(true);

    const [balanceResult, transactionsResult, monthResult] = await Promise.all([
      supabase
        .from("dream_token_transactions")
        .select("amount")
        .eq("user_id", user.id)
        .eq("token_kind", "virtual"),
      supabase
        .from("dream_token_transactions")
        .select("id,amount,type,title,created_at")
        .eq("user_id", user.id)
        .eq("token_kind", "virtual")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("dream_token_transactions")
        .select("amount,type,title")
        .eq("user_id", user.id)
        .eq("token_kind", "virtual")
        .gte("created_at", startOfCurrentMonthIso()),
    ]);

    const available = balanceResult.error
      ? 0
      : (balanceResult.data || []).reduce(
          (sum, row) => sum + Number(row.amount || 0),
          0,
        );

    const monthTransactions = monthResult.error
      ? []
      : (monthResult.data || []).map((row) => {
          const amount = Number(row.amount || 0);
          return {
            amount,
            category: classifyBankTransaction({
              amount,
              type: row.type ? String(row.type) : null,
              title: row.title ? String(row.title) : null,
            }),
          };
        });

    const monthEarned = monthTransactions
      .filter((item) => item.category === "earned")
      .reduce((sum, item) => sum + Math.max(item.amount, 0), 0);

    const monthPurchased = monthTransactions
      .filter((item) => item.category === "purchased")
      .reduce((sum, item) => sum + Math.max(item.amount, 0), 0);

    const monthSpent = Math.abs(
      monthTransactions
        .filter((item) => item.category === "spent")
        .reduce((sum, item) => sum + Math.min(item.amount, 0), 0),
    );

    const monthNet = monthTransactions.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

    const transactions: BankTransaction[] = transactionsResult.error
      ? []
      : (transactionsResult.data || []).map((row) => {
          const amount = Number(row.amount || 0);
          const type = row.type ? String(row.type) : null;
          const title = row.title ? String(row.title) : null;

          return {
            id: String(row.id),
            amount,
            type,
            title,
            createdAt: row.created_at ? String(row.created_at) : null,
            category: classifyBankTransaction({ amount, type, title }),
          };
        });

    // Savings and bond balances intentionally remain zero in Phase 1C.
    // Their tables and transfer logic are introduced in Phases 2 and 3.
    const savings = 0;
    const bonds = 0;
    const interestEarned = 0;

    setAccount({
      available,
      savings,
      bonds,
      interestEarned,
      total: available + savings + bonds,
      monthEarned,
      monthPurchased,
      monthSpent,
      monthNet,
      transactions,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAccount();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadAccount();
    });

    window.addEventListener("focus", loadAccount);
    window.addEventListener("dream-tokens-updated", loadAccount);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", loadAccount);
      window.removeEventListener("dream-tokens-updated", loadAccount);
    };
  }, [loadAccount]);

  return {
    account,
    loading,
    isLoggedIn,
    refresh: loadAccount,
  };
}
