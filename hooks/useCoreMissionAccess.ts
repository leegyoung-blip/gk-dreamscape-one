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

export type CoreAccessStatus =
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
   * Only use true for the very first access check when
   * entering the page.
   *
   * Background checks should stay silent so quizzes and
   * games are not unmounted/reset.
   */
  showChecking?: boolean;
};

export function useCoreMissionAccess() {
  const [status, setStatus] =
    useState<CoreAccessStatus>("checking");

  const [userId, setUserId] =
    useState<string | null>(null);

  const [tokenBalance, setTokenBalance] =
    useState(0);

  const [dreamGemBalance, setDreamGemBalance] =
    useState(0);

  const [
    learningProfile,
    setLearningProfile,
  ] =
    useState<LearningProfileStatus | null>(
      null,
    );

  /*
   * These request IDs prevent an older async request from
   * finishing later and overwriting the result of a newer
   * request.
   */
  const accessRequestIdRef = useRef(0);
  const balanceRequestIdRef = useRef(0);

  const refreshBalances = useCallback(
    async (activeUserId?: string) => {
      const requestId =
        ++balanceRequestIdRef.current;

      let resolvedUserId = activeUserId;

      if (!resolvedUserId) {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (
          requestId !==
          balanceRequestIdRef.current
        ) {
          return;
        }

        if (error) {
          console.warn(
            "Could not resolve user while refreshing balances:",
            error.message,
          );
          return;
        }

        resolvedUserId = user?.id;
      }

      if (!resolvedUserId) {
        if (
          requestId !==
          balanceRequestIdRef.current
        ) {
          return;
        }

        setTokenBalance(0);
        setDreamGemBalance(0);
        return;
      }

      const [
        tokenResult,
        profileResult,
      ] = await Promise.all([
        supabase
          .from(
            "dream_token_transactions",
          )
          .select("amount")
          .eq(
            "user_id",
            resolvedUserId,
          )
          .eq(
            "token_kind",
            "virtual",
          ),

        supabase
          .from("profiles")
          .select("dream_gem_balance")
          .eq("id", resolvedUserId)
          .maybeSingle(),
      ]);

      /*
       * Ignore this response if another balance refresh
       * started after it.
       */
      if (
        requestId !==
        balanceRequestIdRef.current
      ) {
        return;
      }

      if (!tokenResult.error) {
        setTokenBalance(
          tokenResult.data?.reduce(
            (sum, row) =>
              sum +
              Number(row.amount || 0),
            0,
          ) || 0,
        );
      } else {
        console.warn(
          "Could not load Dreamscape Tokens:",
          tokenResult.error.message,
        );
      }

      if (!profileResult.error) {
        setDreamGemBalance(
          Math.max(
            0,
            Number(
              profileResult.data
                ?.dream_gem_balance || 0,
            ),
          ),
        );
      } else {
        console.warn(
          "Could not load Dream Gems:",
          profileResult.error.message,
        );
      }
    },
    [],
  );

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
       * Only the initial page-entry check should put the
       * interface into "checking".
       *
       * Focus changes, screenshots, auth token refreshes,
       * etc. must never temporarily remove the quiz/game
       * from the React tree.
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
         * A background network/auth read failure is not
         * proof that access has been revoked.
         *
         * Keep the current UI alive and try again later.
         */
        if (!showChecking) {
          return;
        }
      }

      if (!user) {
        setUserId(null);
        setLearningProfile(null);
        setTokenBalance(0);
        setDreamGemBalance(0);
        setStatus("signed_out");
        return;
      }

      setUserId(user.id);

      /*
       * Balances are independent UI data.
       * Refreshing them must not affect access state.
       */
      void refreshBalances(user.id);

      /*
       * Resolve account role BEFORE applying learner
       * profile requirements.
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
          "Could not check Core Missions profile:",
          profileResult.error?.message,
        );

        /*
         * Do not eject somebody from a live quiz merely
         * because a background Supabase request failed.
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
       * Staff receive full Core access and do not need a
       * learner DOB/profile.
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

        /*
         * Preserve an already-running learning session
         * during a transient background failure.
         */
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
          .eq("zone_key", "core")
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
          "Could not check Core subscription:",
          subscriptionResult.error.message,
        );
      }

      if (manualAccessResult.error) {
        console.warn(
          "Could not check manual Core access:",
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
       * If either successfully-loaded source proves access,
       * allow immediately.
       */
      if (
        entitlements.core ||
        manuallyUnlocked
      ) {
        setStatus("allowed");
        return;
      }

      /*
       * During a silent/background recheck, an error from
       * either entitlement source means we do not have
       * enough reliable information to revoke access.
       *
       * Keep the existing state.
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
       * grants Core access.
       */
      setStatus("locked");
    },
    [refreshBalances],
  );

  /*
   * Initial page-entry check.
   *
   * This is the ONLY normal access check that deliberately
   * shows the "checking" state.
   */
  useEffect(() => {
    void refreshAccess({
      showChecking: true,
    });
  }, [refreshAccess]);

  useEffect(() => {
    function handleRewardUpdate() {
      void refreshBalances();
    }

    /*
     * Profile changes should be reflected immediately,
     * but without destroying the current page first.
     */
    function handleAccessUpdate() {
      void refreshAccess({
        showChecking: false,
      });
    }

    /*
     * Returning to the browser can still trigger a useful
     * security revalidation, but it is now completely
     * silent unless access has genuinely changed.
     */
    function handleWindowFocus() {
      void refreshAccess({
        showChecking: false,
      });
    }

    window.addEventListener(
      "dream-tokens-updated",
      handleRewardUpdate,
    );

    window.addEventListener(
      "dream-gems-updated",
      handleRewardUpdate,
    );

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
        "dream-tokens-updated",
        handleRewardUpdate,
      );

      window.removeEventListener(
        "dream-gems-updated",
        handleRewardUpdate,
      );

      window.removeEventListener(
        "learning-profile-updated",
        handleAccessUpdate,
      );

      window.removeEventListener(
        "focus",
        handleWindowFocus,
      );

      /*
       * Invalidate any outstanding request after unmount.
       */
      accessRequestIdRef.current += 1;
      balanceRequestIdRef.current += 1;
    };
  }, [
    refreshAccess,
    refreshBalances,
  ]);

  return {
    status,
    userId,
    tokenBalance,
    dreamGemBalance,
    learningProfile,
    refreshBalances,
    refreshAccess,
  };
}