"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getLearningEntitlements,
  roleHasStaffLearningAccess,
} from "@/lib/learning-access";
import { supabase } from "@/lib/supabase";

export type CoreAccessStatus = "checking" | "allowed" | "locked";

type SubscriptionRow = {
  status: string | null;
  access_until: string | null;
  plan_code: string | null;
};

export function useCoreMissionAccess() {
  const [status, setStatus] =
    useState<CoreAccessStatus>("checking");

  const [userId, setUserId] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [dreamGemBalance, setDreamGemBalance] = useState(0);

  const refreshBalances = useCallback(
    async (activeUserId?: string) => {
      const resolvedUserId =
        activeUserId ??
        (await supabase.auth.getUser()).data.user?.id;

      if (!resolvedUserId) {
        setTokenBalance(0);
        setDreamGemBalance(0);
        return;
      }

      const [tokenResult, profileResult] = await Promise.all([
        supabase
          .from("dream_token_transactions")
          .select("amount")
          .eq("user_id", resolvedUserId)
          .eq("token_kind", "virtual"),

        supabase
          .from("profiles")
          .select("dream_gem_balance")
          .eq("id", resolvedUserId)
          .maybeSingle(),
      ]);

      if (tokenResult.error) {
        console.warn(
          "Could not load Dreamscape Tokens:",
          tokenResult.error.message,
        );
      } else {
        const nextTokenBalance =
          tokenResult.data?.reduce(
            (sum, row) => sum + Number(row.amount || 0),
            0,
          ) || 0;

        setTokenBalance(nextTokenBalance);
      }

      if (profileResult.error) {
        console.warn(
          "Could not load Dream Gems:",
          profileResult.error.message,
        );
      } else {
        setDreamGemBalance(
          Math.max(
            0,
            Number(
              profileResult.data?.dream_gem_balance || 0,
            ),
          ),
        );
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function initialise() {
      setStatus("checking");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (authError) {
        console.warn(
          "Could not check the signed-in Core user:",
          authError.message,
        );
      }

      if (!user) {
        setUserId(null);
        setTokenBalance(0);
        setDreamGemBalance(0);
        setStatus("locked");
        return;
      }

      setUserId(user.id);

      void refreshBalances(user.id);

      const [
        profileResult,
        subscriptionResult,
        manualAccessResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("role,tier")
          .eq("id", user.id)
          .maybeSingle(),

        supabase
          .from("nova_subscriptions")
          .select("status,access_until,plan_code")
          .eq("user_id", user.id),

        supabase
          .from("learning_mission_zone_access")
          .select("is_unlocked")
          .eq("user_id", user.id)
          .eq("zone_key", "core")
          .maybeSingle(),
      ]);

      if (cancelled) return;

      if (profileResult.error || !profileResult.data) {
        console.warn(
          "Could not check Core Missions profile:",
          profileResult.error?.message ||
            "Profile record was not found.",
        );

        setStatus("locked");
        return;
      }

      if (subscriptionResult.error) {
        console.warn(
          "Could not check Core subscription:",
          subscriptionResult.error.message,
        );
      }

      if (manualAccessResult.error) {
        console.info(
          "Could not check manual Core access:",
          manualAccessResult.error.message,
        );
      }

      const roleValue =
        profileResult.data.role ||
        profileResult.data.tier ||
        null;

      /*
       * Staff access is checked directly here as a safeguard.
       * This ensures admin, teacher and curriculum_lead users
       * cannot be blocked by subscription or manual-access logic.
       */
      const hasStaffCoreAccess =
        roleHasStaffLearningAccess(roleValue);

      const entitlements = getLearningEntitlements(
        roleValue,
        subscriptionResult.error
          ? []
          : ((subscriptionResult.data ||
              []) as SubscriptionRow[]),
      );

      const manuallyUnlocked =
        !manualAccessResult.error &&
        Boolean(
          manualAccessResult.data?.is_unlocked,
        );

      const hasCoreAccess =
        hasStaffCoreAccess ||
        entitlements.core ||
        manuallyUnlocked;

      setStatus(
        hasCoreAccess ? "allowed" : "locked",
      );
    }

    void initialise();

    return () => {
      cancelled = true;
    };
  }, [refreshBalances]);

  useEffect(() => {
    function handleRewardUpdate() {
      void refreshBalances();
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
      "focus",
      handleRewardUpdate,
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
        "focus",
        handleRewardUpdate,
      );
    };
  }, [refreshBalances]);

  return {
    status,
    userId,
    tokenBalance,
    dreamGemBalance,
    refreshBalances,
  };
}
