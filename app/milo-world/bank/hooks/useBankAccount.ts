"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { BankAccountSnapshot, BankTransaction } from "../lib/bank-types";

const EMPTY_ACCOUNT: BankAccountSnapshot = {
  available: 0,
  savings: 0,
  bonds: 0,
  interestEarned: 0,
  total: 0,
  monthEarned: 0,
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
        .limit(12),
      supabase
        .from("dream_token_transactions")
        .select("amount")
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

    const monthAmounts = monthResult.error
      ? []
      : (monthResult.data || []).map((row) => Number(row.amount || 0));

    const monthEarned = monthAmounts
      .filter((amount) => amount > 0)
      .reduce((sum, amount) => sum + amount, 0);
    const monthSpent = Math.abs(
      monthAmounts
        .filter((amount) => amount < 0)
        .reduce((sum, amount) => sum + amount, 0),
    );

    const transactions: BankTransaction[] = transactionsResult.error
      ? []
      : (transactionsResult.data || []).map((row) => ({
          id: String(row.id),
          amount: Number(row.amount || 0),
          type: row.type ? String(row.type) : null,
          title: row.title ? String(row.title) : null,
          createdAt: row.created_at ? String(row.created_at) : null,
        }));

    // Savings and bond balances intentionally remain zero in Phase 1B.
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
      monthSpent,
      monthNet: monthEarned - monthSpent,
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
