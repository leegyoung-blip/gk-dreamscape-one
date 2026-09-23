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

type AccessibleAccountRow = {
  id?: string | null;
  username?: string | null;
  relationship?: string | null;
};

function cleanAccountName(value: unknown, fallback = "Account") {
  const name = String(value || "").trim();
  return name || fallback;
}

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
              ? "NOVA+ is not available for this account yet."
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

      const [{ data: profileRow }, accountsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("role,username")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.rpc("get_nova_plus_accessible_accounts"),
      ]);

      if (cancelled) return;

      const role = normaliseRole(profileRow?.role) || "regular";
      let learners: NovaPlusLearner[] = [];

      if (!accountsResult.error && Array.isArray(accountsResult.data)) {
        for (const raw of accountsResult.data as AccessibleAccountRow[]) {
          const id = String(raw.id || "").trim();
          if (!id || learners.some((account) => account.id === id)) continue;

          learners.push({
            id,
            label: cleanAccountName(raw.username),
            relationship: String(raw.relationship || "linked"),
          });
        }
      } else {
        // Compatibility fallback if the optional account-name RPC has not yet
        // been installed. Self still uses the real profiles.username value.
        const { data: accessRows, error: accessError } = await supabase
          .from("learning_dashboard_access")
          .select("student_user_id,student_label,relationship")
          .eq("viewer_user_id", user.id)
          .eq("is_active", true)
          .order("student_label", { ascending: true });

        if (!accessError) {
          for (const row of accessRows ?? []) {
            const id = String(row.student_user_id || "").trim();
            if (!id || learners.some((account) => account.id === id)) continue;
            learners.push({
              id,
              label: cleanAccountName(row.student_label),
              relationship: String(row.relationship || "linked"),
            });
          }
        }

        if (!learners.some((account) => account.id === user.id)) {
          learners.push({
            id: user.id,
            label: cleanAccountName(
              profileRow?.username,
              String(user.email || "Account").split("@")[0] || "Account",
            ),
            relationship: "self",
          });
        }
      }

      if (learners.length === 0) {
        learners = [
          {
            id: user.id,
            label: cleanAccountName(
              profileRow?.username,
              String(user.email || "Account").split("@")[0] || "Account",
            ),
            relationship: "self",
          },
        ];
      }

      const requestedIsAllowed =
        Boolean(requestedLearnerId) &&
        learners.some((account) => account.id === requestedLearnerId);

      const linkedAccount = learners.find((account) => account.relationship !== "self");
      const selectedLearnerId = requestedIsAllowed
        ? String(requestedLearnerId)
        : linkedAccount?.id || user.id;

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
      state.learners.find((account) => account.id === state.selectedLearnerId) ??
      null,
    [state.learners, state.selectedLearnerId],
  );

  const selectLearner = useCallback(
    async (learnerId: string) => {
      if (!state.learners.some((account) => account.id === learnerId)) return;
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
