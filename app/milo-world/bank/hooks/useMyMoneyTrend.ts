"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { BankAccountSnapshot } from "../lib/bank-types";

export type MoneyTrendRange = "30d" | "90d" | "1y";

export type MoneyTrendPoint = {
  timestamp: number;
  label: string;
  savings: number;
  portfolio: number;
};

type SavingsMovementRow = {
  movement_type: string | null;
  amount: number | string | null;
  created_at: string | null;
};

type BondHoldingRow = {
  principal: number | string | null;
  purchased_at: string | null;
  settled_at: string | null;
  status: string | null;
};

type TrendEvent = {
  at: number;
  amount: number;
};

function rangeDays(range: MoneyTrendRange) {
  if (range === "30d") return 30;
  if (range === "90d") return 90;
  return 365;
}

function startForRange(range: MoneyTrendRange) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - rangeDays(range));
  return date;
}

function formatPointLabel(date: Date, range: MoneyTrendRange) {
  return date.toLocaleDateString("en-SG", {
    day: range === "1y" ? undefined : "numeric",
    month: "short",
    year: range === "1y" ? "2-digit" : undefined,
  });
}

function messageFrom(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Could not load money history.";
}

export function useMyMoneyTrend(
  account: Pick<BankAccountSnapshot, "savings" | "bonds">,
  isLoggedIn: boolean,
  range: MoneyTrendRange,
) {
  const [points, setPoints] = useState<MoneyTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isLoggedIn) {
      setPoints([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setPoints([]);
      setLoading(false);
      return;
    }

    const start = startForRange(range);
    const startIso = start.toISOString();

    const [savingsResult, bondsResult] = await Promise.all([
      supabase
        .from("milo_bank_savings_movements")
        .select("movement_type,amount,created_at")
        .eq("user_id", user.id)
        .gte("created_at", startIso)
        .order("created_at", { ascending: true })
        .limit(2500),
      supabase
        .from("milo_bank_bond_holdings")
        .select("principal,purchased_at,settled_at,status")
        .eq("user_id", user.id)
        .order("purchased_at", { ascending: true })
        .limit(1000),
    ]);

    if (savingsResult.error || bondsResult.error) {
      setError(
        messageFrom(savingsResult.error || bondsResult.error),
      );
      setLoading(false);
      return;
    }

    const savingsEvents: TrendEvent[] = (
      (savingsResult.data ?? []) as SavingsMovementRow[]
    )
      .map((row) => {
        const at = row.created_at ? new Date(row.created_at).getTime() : NaN;
        const rawAmount = Math.max(0, Number(row.amount || 0));
        const amount = row.movement_type === "withdrawal" ? -rawAmount : rawAmount;
        return { at, amount };
      })
      .filter((event) => Number.isFinite(event.at) && event.amount !== 0);

    const bondEvents: TrendEvent[] = [];
    for (const row of (bondsResult.data ?? []) as BondHoldingRow[]) {
      const principal = Math.max(0, Number(row.principal || 0));
      if (!principal) continue;

      const purchasedAt = row.purchased_at
        ? new Date(row.purchased_at).getTime()
        : NaN;
      if (Number.isFinite(purchasedAt) && purchasedAt >= start.getTime()) {
        bondEvents.push({ at: purchasedAt, amount: principal });
      }

      const settledAt = row.settled_at
        ? new Date(row.settled_at).getTime()
        : NaN;
      if (Number.isFinite(settledAt) && settledAt >= start.getTime()) {
        bondEvents.push({ at: settledAt, amount: -principal });
      }
    }

    savingsEvents.sort((a, b) => a.at - b.at);
    bondEvents.sort((a, b) => a.at - b.at);

    const savingsNetInRange = savingsEvents.reduce(
      (sum, event) => sum + event.amount,
      0,
    );
    const bondNetInRange = bondEvents.reduce(
      (sum, event) => sum + event.amount,
      0,
    );

    let runningSavings = Math.max(0, Number(account.savings || 0) - savingsNetInRange);
    let runningBonds = Math.max(0, Number(account.bonds || 0) - bondNetInRange);
    let savingsIndex = 0;
    let bondIndex = 0;

    const nextPoints: MoneyTrendPoint[] = [];
    const cursor = new Date(start);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    while (cursor.getTime() <= today.getTime()) {
      const dayEnd = new Date(cursor);
      dayEnd.setHours(23, 59, 59, 999);
      const cutoff = dayEnd.getTime();

      while (
        savingsIndex < savingsEvents.length &&
        savingsEvents[savingsIndex].at <= cutoff
      ) {
        runningSavings = Math.max(
          0,
          runningSavings + savingsEvents[savingsIndex].amount,
        );
        savingsIndex += 1;
      }

      while (
        bondIndex < bondEvents.length &&
        bondEvents[bondIndex].at <= cutoff
      ) {
        runningBonds = Math.max(0, runningBonds + bondEvents[bondIndex].amount);
        bondIndex += 1;
      }

      nextPoints.push({
        timestamp: cursor.getTime(),
        label: formatPointLabel(cursor, range),
        savings: runningSavings,
        portfolio: runningSavings + runningBonds,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    setPoints(nextPoints);
    setLoading(false);
  }, [account.bonds, account.savings, isLoggedIn, range]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener("milo-bank-savings-updated", refresh);
    window.addEventListener("milo-bank-bonds-updated", refresh);
    return () => {
      window.removeEventListener("milo-bank-savings-updated", refresh);
      window.removeEventListener("milo-bank-bonds-updated", refresh);
    };
  }, [load]);

  return { points, loading, error, refresh: load };
}
