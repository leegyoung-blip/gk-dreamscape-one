"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getLearningEntitlements,
  roleHasStaffLearningAccess,
} from "@/lib/learning-access";
import { supabase } from "@/lib/supabase";

export type ScienceAccessStatus =
  | "checking"
  | "signed_out"
  | "profile_required"
  | "allowed"
  | "locked";

type SubscriptionRow = {
  status: string | null;
  access_until: string | null;
  plan_code: string | null;
};

type LearningProfileStatus = {
  complete?: boolean;
  missing_fields?: string[];
  date_of_birth?: string | null;
  age_years?: number | null;
  age_band?: string | null;
};

type RefreshAccessOptions = {
  /**
   * Only the initial page-entry access check should show
   * the checking screen.
   */
  showChecking?: boolean;
};

export function useScienceMissionAccess() {
  const [status, setStatus] =
    useState<ScienceAccessStatus>(
      "checking",
    );

  const [userId, setUserId] =
    useState<string | null>(null);

  const [
    learningProfile,
    setLearningProfile,
  ] =
    useState<LearningProfileStatus | null>(
      null,
    );

  /*
   * Prevent older async checks from overwriting the result
   * of a newer check.
   */
  const accessRequestIdRef = useRef(0);

  const refreshAccess = useCallback(
    async (
      options: RefreshAccessOptions = {},
    ) => {
      const {
        showChecking = false,
      } = options;

      const requestId =
        ++accessRequestIdRef.current;

      /*
       * CRITICAL:
       *
       * Background access checks must not temporarily
       * switch the page to "checking", because doing that
       * can unmount an active quiz.
       */
      if (showChecking) {
        setStatus("checking");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (
        requestId !==
        accessRequestIdRef.current
      ) {
        return;
      }

      if (userError) {
        console.warn(
          "Could not check the current user:",
          userError.message,
        );

        /*
         * A temporary background authentication/network
         * failure is not enough reason to destroy an
         * active learner session.
         */
        if (!showChecking) {
          return;
        }
      }

      if (!user) {
        setUserId(null);
        setLearningProfile(null);
        setStatus("signed_out");
        return;
      }

      setUserId(user.id);

      /*
       * Resolve staff role BEFORE applying the learner
       * date-of-birth/profile gate.
       */
      const profileResult =
        await supabase
          .from("profiles")
          .select("role,tier")
          .eq("id", user.id)
          .maybeSingle();

      if (
        requestId !==
        accessRequestIdRef.current
      ) {
        return;
      }

      if (
        profileResult.error ||
        !profileResult.data
      ) {
        console.warn(
          "Could not check Science Missions profile:",
          profileResult.error?.message,
        );

        /*
         * Initial entry remains fail-closed.
         * Background revalidation remains non-destructive.
         */
        if (showChecking) {
          setStatus("locked");
        }

        return;
      }

      const role =
        profileResult.data.role ||
        profileResult.data.tier ||
        null;

      /*
       * Admin / Teacher / Curriculum Lead receive full
       * Science access and are not learner-DOB gated.
       */
      if (
        roleHasStaffLearningAccess(role)
      ) {
        setLearningProfile(null);
        setStatus("allowed");
        return;
      }

      const {
        data: learningProfileData,
        error: learningProfileError,
      } = await supabase.rpc(
        "get_my_learning_profile_status",
      );

      if (
        requestId !==
        accessRequestIdRef.current
      ) {
        return;
      }

      if (learningProfileError) {
        console.warn(
          "Could not check the learner profile:",
          learningProfileError.message,
        );

        if (showChecking) {
          setStatus("locked");
        }

        return;
      }

      const resolvedLearningProfile =
        (learningProfileData ||
          {}) as LearningProfileStatus;

      setLearningProfile(
        resolvedLearningProfile,
      );

      if (
        !resolvedLearningProfile.complete
      ) {
        setStatus("profile_required");
        return;
      }

      const [
        subscriptionResult,
        manualAccessResult,
      ] = await Promise.all([
        supabase
          .from("nova_subscriptions")
          .select(
            "status,access_until,plan_code",
          )
          .eq("user_id", user.id),

        supabase
          .from(
            "learning_mission_zone_access",
          )
          .select("is_unlocked")
          .eq("user_id", user.id)
          .eq("zone_key", "science")
          .maybeSingle(),
      ]);

      if (
        requestId !==
        accessRequestIdRef.current
      ) {
        return;
      }

      if (subscriptionResult.error) {
        console.warn(
          "Could not check Science subscription:",
          subscriptionResult.error.message,
        );
      }

      if (manualAccessResult.error) {
        console.warn(
          "Could not check manual Science access:",
          manualAccessResult.error.message,
        );
      }

      const entitlements =
        getLearningEntitlements(
          role,
          subscriptionResult.error
            ? []
            : ((subscriptionResult.data ||
                []) as SubscriptionRow[]),
        );

      const manuallyUnlocked =
        !manualAccessResult.error &&
        Boolean(
          manualAccessResult.data
            ?.is_unlocked,
        );

      /*
       * A successfully-loaded entitlement source can prove
       * access even if the other source had an error.
       */
      if (
        entitlements.science ||
        manuallyUnlocked
      ) {
        setStatus("allowed");
        return;
      }

      /*
       * Do not revoke a live Science session because one
       * of the background entitlement queries temporarily
       * failed.
       */
      if (
        !showChecking &&
        (subscriptionResult.error ||
          manualAccessResult.error)
      ) {
        return;
      }

      /*
       * Both access sources loaded successfully and neither
       * grants Science access.
       */
      setStatus("locked");
    },
    [],
  );

  /*
   * Initial entry.
   */
  useEffect(() => {
    void refreshAccess({
      showChecking: true,
    });
  }, [refreshAccess]);

  useEffect(() => {
    function handleAccessUpdate() {
      void refreshAccess({
        showChecking: false,
      });
    }

    function handleWindowFocus() {
      void refreshAccess({
        showChecking: false,
      });
    }

    window.addEventListener(
      "learning-profile-updated",
      handleAccessUpdate,
    );

    window.addEventListener(
      "focus",
      handleWindowFocus,
    );

    return () => {
      window.removeEventListener(
        "learning-profile-updated",
        handleAccessUpdate,
      );

      window.removeEventListener(
        "focus",
        handleWindowFocus,
      );

      /*
       * Ignore any async access request that finishes after
       * this hook has unmounted.
       */
      accessRequestIdRef.current += 1;
    };
  }, [refreshAccess]);

  return {
    status,
    userId,
    learningProfile,
    refreshAccess,
  };
}