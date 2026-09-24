"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_FINANCIAL_ADVISOR,
  FINANCIAL_ADVISOR_STORAGE_KEY,
} from "../lib/financial-advisors";
import {
  getFinancialAdvisorPreference,
  saveFinancialAdvisorPreference,
} from "../lib/financial-advisor-api";
import type { FinancialAdvisorId } from "../lib/financial-learning-engine-types";

function readLocalPreference(): FinancialAdvisorId {
  if (typeof window === "undefined") return DEFAULT_FINANCIAL_ADVISOR;
  const stored = window.localStorage.getItem(FINANCIAL_ADVISOR_STORAGE_KEY);
  return stored === "nova" || stored === "milo" ? stored : DEFAULT_FINANCIAL_ADVISOR;
}

export function useFinancialAdvisor(isLoggedIn: boolean) {
  const [advisorId, setAdvisorIdState] = useState<FinancialAdvisorId>(DEFAULT_FINANCIAL_ADVISOR);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const local = readLocalPreference();
    setAdvisorIdState(local);

    async function load() {
      if (!isLoggedIn) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const remote = await getFinancialAdvisorPreference();
        if (cancelled || !remote) return;
        setAdvisorIdState(remote);
        window.localStorage.setItem(FINANCIAL_ADVISOR_STORAGE_KEY, remote);
      } catch {
        // Local storage is an intentional fallback so a missing preference
        // migration never blocks the lesson experience.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const setAdvisorId = useCallback(
    async (next: FinancialAdvisorId) => {
      setAdvisorIdState(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(FINANCIAL_ADVISOR_STORAGE_KEY, next);
      }

      if (!isLoggedIn) return;
      setSaving(true);
      try {
        await saveFinancialAdvisorPreference(next);
      } catch {
        // Keep the local choice even if remote persistence is unavailable.
      } finally {
        setSaving(false);
      }
    },
    [isLoggedIn],
  );

  return { advisorId, setAdvisorId, loading, saving };
}
