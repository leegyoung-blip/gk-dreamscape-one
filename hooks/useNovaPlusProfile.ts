"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

/**
 * This hook intentionally DOES NOT grant access or modify NOVA+ roles.
 * The Postgres functions get_nova_plus_learning_profile() and
 * refresh_nova_plus_learning_profile() must independently authorize the
 * authenticated viewer and the requested linked learner.
 *
 * If Founding 50 passes the outer UI gate but this database RPC rejects the
 * account, we report the missing database integration instead of claiming the
 * beta is inactive. See sql/inspect_nova_plus_functions.sql.
 */
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

  // Request ordering guard. Every profile request takes a new token; a
  // response may only land while its token is still the latest AND its
  // learner is still the selected one. Learner switches, effect cleanup and
  // unmount all advance the token so late responses are discarded.
  const requestIdRef = useRef(0);
  const selectedLearnerRef = useRef<string | null>(null);

  const isAdminPreview = normaliseRole(state.viewerRole) === "admin";

  const loadProfile = useCallback(
    async (learnerId: string, refresh = false) => {
      const requestId = ++requestIdRef.current;
      const isCurrent = () =>
        requestIdRef.current === requestId &&
        selectedLearnerRef.current === learnerId;

      setState((current) => ({
        ...current,
        loading: refresh ? current.loading : true,
        refreshing: refresh,
        error: "",
      }));

      // Ends loading/refreshing with an error. An ordinary refresh failure
      // keeps this learner's last good profile; access denial and first-load
      // failures never show a profile.
      const fail = (message: string, clearProfile = false) => {
        setState((current) => ({
          ...current,
          profile:
            refresh &&
            !clearProfile &&
            current.profile?.student_user_id === learnerId
              ? current.profile
              : null,
          loading: false,
          refreshing: false,
          error: message,
        }));
      };

      const rpcName = refresh
        ? "refresh_nova_plus_learning_profile"
        : "get_nova_plus_learning_profile";

      let data: unknown = null;
      let error: { message: string } | null = null;

      try {
        const result = await supabase.rpc(rpcName, {
          p_student_user_id: learnerId,
        });
        data = result.data;
        error = result.error;
      } catch {
        if (!isCurrent()) return;
        fail("NOVA+ could not be reached. Check your connection and try again.");
        return;
      }

      if (!isCurrent()) return;

      if (error) {
        let message = error.message;
        const accessDenied = error.message.includes("NOVA_PLUS_ACCESS_REQUIRED");

        if (accessDenied) {
          message = "NOVA+ is not available for this account yet.";

          // Diagnostics only. An active beta does not override a database
          // rejection or give access to an unrelated learner's records.
          // A failed or rejected check keeps the generic message.
          try {
            const { data: activeBeta, error: betaCheckError } = await supabase.rpc(
              "current_user_has_founding50_nova_plus",
            );

            if (!isCurrent()) return;

            if (!betaCheckError && activeBeta === true) {
              message =
                "Your Founding 50 beta is active, but this learner's NOVA+ " +
                "profile could not be opened. Confirm that the learner is " +
                "selected for the beta and linked to this account.";
              console.warn(
                "Founding 50 access integration: NOVA+ profile RPC rejected an active beta account.",
                rpcName,
              );
            }
          } catch {
            if (!isCurrent()) return;
          }
        }

        fail(message, accessDenied);
        return;
      }

      const payload = (data ?? null) as NovaPlusProfilePayload | null;

      // The profile RPCs always emit student_user_id. Require an exact,
      // nonblank match so a profile is never shown under the wrong learner.
      const payloadLearnerId = payload?.student_user_id;
      if (
        typeof payloadLearnerId !== "string" ||
        payloadLearnerId.trim() === "" ||
        payloadLearnerId !== learnerId
      ) {
        console.warn("NOVA+ profile response did not match the requested learner.");
        fail("This learner's NOVA+ profile could not be loaded. Please try again.");
        return;
      }

      setState((current) => ({
        ...current,
        profile: payload,
        loading: false,
        refreshing: false,
        error: "",
      }));
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function initialise() {
      selectedLearnerRef.current = null;
      setState((current) => ({
        ...current,
        selectedLearnerId: null,
        profile: null,
        loading: true,
        refreshing: false,
        error: "",
      }));

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

      // Only beta-only accounts are narrowed to the one selected learner.
      // Paid/manual/admin access retains the original accessible-learner list.
      const [existingAccess, selectedBetaLearner] = await Promise.all([
        supabase.rpc("current_user_has_nova_plus"),
        supabase.rpc("current_user_f50_nova_plus_learner_id"),
      ]);
      if (cancelled) return;
      const hasExistingAccess = role === "admin" || existingAccess.data === true;
      if (!hasExistingAccess) {
        const selectedBetaId = typeof selectedBetaLearner.data === "string"
          ? selectedBetaLearner.data
          : null;
        const permittedLearner = learners.find((account) => account.id === selectedBetaId);
        if (!permittedLearner) {
          setState((current) => ({
            ...current,
            viewerId: user.id,
            viewerRole: role,
            learners: [],
            selectedLearnerId: null,
            profile: null,
            loading: false,
            error:
              "NOVA+ is not yet assigned to a learner in this account. " +
              "If your Founding 50 beta is active, contact Dreamscape support " +
              "to confirm the selected learner.",
          }));
          return;
        }
        learners = [permittedLearner];
      }

      const requestedIsAllowed =
        Boolean(requestedLearnerId) &&
        learners.some((account) => account.id === requestedLearnerId);

      const linkedAccount = learners.find((account) => account.relationship !== "self");
      const selectedLearnerId = requestedIsAllowed
        ? String(requestedLearnerId)
        : linkedAccount?.id || user.id;

      selectedLearnerRef.current = selectedLearnerId;
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
      // Invalidate any profile request still in flight from this run.
      requestIdRef.current += 1;
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
      selectedLearnerRef.current = learnerId;
      setState((current) => ({
        ...current,
        selectedLearnerId: learnerId,
        profile: null,
        loading: true,
        refreshing: false,
        error: "",
      }));
      await loadProfile(learnerId, false);
    },
    [loadProfile, state.learners],
  );

  const refresh = useCallback(async () => {
    const learnerId = selectedLearnerRef.current;
    if (!learnerId) return;
    await loadProfile(learnerId, true);
  }, [loadProfile]);

  return {
    ...state,
    selectedLearner,
    isAdminPreview,
    selectLearner,
    refresh,
  };
}
