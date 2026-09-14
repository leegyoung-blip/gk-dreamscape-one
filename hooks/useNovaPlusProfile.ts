"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  NovaPlusLearner,
  NovaPlusProfilePayload,
} from "@/lib/nova-plus/types";
import { normaliseRole } from "@/lib/nova-plus/helpers";

type HookState = {
  viewerId: string | null;
  viewerRole: string;
  learners: NovaPlusLearner[];
  selectedLearnerId: string | null;
  profile: NovaPlusProfilePayload | null;
  loading: boolean;
  refreshing: boolean;
  error: string;
};

export function useNovaPlusProfile(requestedLearnerId?: string | null) {
  const [state, setState] = useState<HookState>({
    viewerId: null,
    viewerRole: "regular",
    learners: [],
    selectedLearnerId: null,
    profile: null,
    loading: true,
    refreshing: false,
    error: "",
  });

  const isAdminPreview = normaliseRole(state.viewerRole) === "admin";

  const loadProfile = useCallback(
    async (learnerId: string, refresh = false) => {
      setState((current) => ({
        ...current,
        loading: refresh ? current.loading : true,
        refreshing: refresh,
        error: "",
      }));

      const rpcName = refresh
        ? "refresh_nova_plus_learning_profile"
        : "get_nova_plus_learning_profile";

      const { data, error } = await supabase.rpc(rpcName, {
        p_student_user_id: learnerId,
      });

      if (error) {
        setState((current) => ({
          ...current,
          profile: null,
          loading: false,
          refreshing: false,
          error:
            error.message.includes("NOVA_PLUS_ACCESS_REQUIRED")
              ? "NOVA+ is not available for this learner yet."
              : error.message,
        }));
        return;
      }

      setState((current) => ({
        ...current,
        profile: (data ?? null) as NovaPlusProfilePayload | null,
        loading: false,
        refreshing: false,
      }));
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function initialise() {
      setState((current) => ({ ...current, loading: true, error: "" }));

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        setState((current) => ({
          ...current,
          viewerId: null,
          learners: [],
          selectedLearnerId: null,
          profile: null,
          loading: false,
          error: "Please log in to open NOVA+.",
        }));
        return;
      }

      const [{ data: profileRow }, { data: accessRows, error: accessError }] =
        await Promise.all([
          supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
          supabase
            .from("learning_dashboard_access")
            .select("student_user_id,student_label,relationship")
            .eq("viewer_user_id", user.id)
            .eq("is_active", true)
            .order("student_label", { ascending: true }),
        ]);

      if (cancelled) return;

      const role = normaliseRole(profileRow?.role) || "regular";
      const linkedLearners: NovaPlusLearner[] = [];

      if (!accessError) {
        for (const row of accessRows ?? []) {
          const id = String(row.student_user_id || "");
          if (!id || linkedLearners.some((learner) => learner.id === id)) continue;
          linkedLearners.push({
            id,
            label: String(row.student_label || "Learner"),
            relationship: String(row.relationship || "linked"),
          });
        }
      }

      // The workspace always represents the learner, never the parent identity.
      // If a linked learner exists, prefer that learner over the viewer's own account.
      const selfLearner: NovaPlusLearner = {
        id: user.id,
        label: "Learner",
        relationship: "self",
      };

      const learners = linkedLearners.length > 0
        ? [...linkedLearners, selfLearner]
        : [selfLearner];

      const requestedIsAllowed =
        Boolean(requestedLearnerId) &&
        learners.some((learner) => learner.id === requestedLearnerId);

      const selectedLearnerId = requestedIsAllowed
        ? String(requestedLearnerId)
        : linkedLearners[0]?.id || user.id;

      setState((current) => ({
        ...current,
        viewerId: user.id,
        viewerRole: role,
        learners,
        selectedLearnerId,
        loading: true,
      }));

      await loadProfile(selectedLearnerId, false);
    }

    void initialise();

    return () => {
      cancelled = true;
    };
  }, [loadProfile, requestedLearnerId]);

  const selectedLearner = useMemo(
    () =>
      state.learners.find((learner) => learner.id === state.selectedLearnerId) ??
      null,
    [state.learners, state.selectedLearnerId],
  );

  const selectLearner = useCallback(
    async (learnerId: string) => {
      if (!state.learners.some((learner) => learner.id === learnerId)) return;
      setState((current) => ({
        ...current,
        selectedLearnerId: learnerId,
        profile: null,
      }));
      await loadProfile(learnerId, false);
    },
    [loadProfile, state.learners],
  );

  const refresh = useCallback(async () => {
    if (!state.selectedLearnerId) return;
    await loadProfile(state.selectedLearnerId, true);
  }, [loadProfile, state.selectedLearnerId]);

  return {
    ...state,
    selectedLearner,
    isAdminPreview,
    selectLearner,
    refresh,
  };
}
