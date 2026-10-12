"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { normaliseEnglishMasteryProfile } from "@/lib/nova-plus/english-mastery-normalizer";
import type {
  EnglishMasteryHookState,
  EnglishMasteryProfilePayload,
} from "@/lib/nova-plus/english-mastery-types";

export function useEnglishMasteryProfile(
  learnerId: string | null,
  primaryLevel: number | null = null,
): EnglishMasteryHookState {
  const [profile, setProfile] =
    useState<EnglishMasteryProfilePayload | null>(null);
  const [loading, setLoading] = useState(Boolean(learnerId));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "refresh") => {
      const requestId = ++requestIdRef.current;

      if (!learnerId) {
        setProfile(null);
        setError(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (mode === "initial") {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      const { data, error: rpcError } = await supabase.rpc(
        "get_english_mastery_profile_for_learner",
        {
          p_student_user_id: learnerId,
          p_primary_level: primaryLevel,
        },
      );

      if (requestId !== requestIdRef.current) return;

      if (rpcError) {
        setError(rpcError.message || "English mastery could not be loaded.");
        if (mode === "initial") setProfile(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const next = normaliseEnglishMasteryProfile(data);
        setProfile(next);
      } catch (normaliseError) {
        setError(
          normaliseError instanceof Error
            ? normaliseError.message
            : "English mastery data could not be read.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [learnerId, primaryLevel],
  );

  useEffect(() => {
    void load("initial");

    return () => {
      requestIdRef.current += 1;
    };
  }, [load]);

  const refresh = useCallback(async () => {
    await load("refresh");
  }, [load]);

  return {
    profile,
    loading,
    refreshing,
    error,
    refresh,
  };
}
