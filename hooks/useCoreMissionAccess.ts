"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  roleHasStaffLearningAccess,
} from "@/lib/learning-access";
import { supabase } from "@/lib/supabase";

export type CoreAccessStatus =
  | "checking"
  | "signed_out"
  | "profile_required"
  | "allowed"
  | "locked";

type LearningProfileStatus = {
  complete?: boolean;
  missing_fields?: string[];
  date_of_birth?: string | null;
  age_years?: number | null;
  age_band?: string | null;
};

type AccessRpcResult = {
  authenticated?: boolean;
  user_id?: string | null;
  role?: string | null;
  is_staff?: boolean;
  core?: boolean;
  science?: boolean;
  business_builder?: boolean;
  rewards?: boolean;
  any_paid_access?: boolean;
  active_plans?: string[];
  next_access_until?: string | null;
};

type RefreshAccessOptions = {
  /**
   * Only true for the very first access check when entering
   * the page.
   *
   * Background checks must stay silent so quizzes and games
   * are not unmounted/reset.
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
       * Balances are independent UI data and must never
       * control entitlement state.
       */
      void refreshBalances(user.id);

      /*
       * Load the profile role first so staff can retain the
       * existing full-learning-access override.
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

        if (showChecking) {
          setStatus("locked");
        }

        return;
      }

      const role =
        profileResult.data.role ||
        profileResult.data.tier ||
        null;

      if (
        roleHasStaffLearningAccess(role)
      ) {
        setLearningProfile(null);
        setStatus("allowed");
        return;
      }

      /*
       * Canonical paid entitlement is resolved by the
       * database using auth.uid().
       *
       * This avoids depending on browser-side RLS visibility
       * of nova_subscriptions.
       */
      const [
        accessResult,
        manualAccessResult,
        learningProfileResult,
      ] = await Promise.all([
        supabase.rpc(
          "dreamscape_get_my_learning_access",
        ),

        supabase
          .from(
            "learning_mission_zone_access",
          )
          .select("is_unlocked")
          .eq("user_id", user.id)
          .eq("zone_key", "core")
          .maybeSingle(),

        supabase.rpc(
          "get_my_learning_profile_status",
        ),
      ]);

      if (
        requestId !==
        accessRequestIdRef.current
      ) {
        return;
      }

      if (accessResult.error) {
        console.warn(
          "Could not check Core paid entitlement:",
          accessResult.error.message,
        );
      }

      if (manualAccessResult.error) {
        console.warn(
          "Could not check manual Core access:",
          manualAccessResult.error.message,
        );
      }

      if (learningProfileResult.error) {
        console.warn(
          "Could not check the learner profile:",
          learningProfileResult.error.message,
        );
      }

      const access =
        (accessResult.data ||
          {}) as AccessRpcResult;

      const manuallyUnlocked =
        !manualAccessResult.error &&
        Boolean(
          manualAccessResult.data
            ?.is_unlocked,
        );

      /*
       * Paid Core/Complete access or a manual unlock wins
       * immediately, even if learner-profile onboarding is
       * not yet complete.
       */
      if (
        Boolean(access.core) ||
        manuallyUnlocked
      ) {
        if (
          !learningProfileResult.error
        ) {
          setLearningProfile(
            (learningProfileResult.data ||
              {}) as LearningProfileStatus,
          );
        }

        setStatus("allowed");
        return;
      }

      /*
       * During a silent/background recheck, a temporary
       * access read failure is not enough evidence to remove
       * a learner from a running quiz/game.
       */
      if (
        !showChecking &&
        (accessResult.error ||
          manualAccessResult.error)
      ) {
        return;
      }

      /*
       * No paid/manual Core entitlement. The existing
       * learner-profile requirement still applies.
       */
      if (learningProfileResult.error) {
        if (showChecking) {
          setStatus("locked");
        }

        return;
      }

      const resolvedLearningProfile =
        (learningProfileResult.data ||
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

      setStatus("locked");
    },
    [refreshBalances],
  );

  /*
   * Initial page-entry check.
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

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (event) => {
          if (
            event === "SIGNED_OUT"
          ) {
            accessRequestIdRef.current += 1;
            balanceRequestIdRef.current += 1;
            setUserId(null);
            setLearningProfile(null);
            setTokenBalance(0);
            setDreamGemBalance(0);
            setStatus("signed_out");
            return;
          }

          window.setTimeout(() => {
            void refreshAccess({
              showChecking: false,
            });
          }, 0);
        },
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

      subscription.unsubscribe();

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
