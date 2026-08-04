"use client";

import { useCallback, useEffect, useState } from "react";
import { getLearningEntitlements } from "@/lib/learning-access";
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

export function useCoreMissionAccess() {
  const [status, setStatus] =
    useState<CoreAccessStatus>("checking");
  const [userId, setUserId] =
    useState<string | null>(null);
  const [tokenBalance, setTokenBalance] =
    useState(0);
  const [dreamGemBalance, setDreamGemBalance] =
    useState(0);
  const [learningProfile, setLearningProfile] =
    useState<LearningProfileStatus | null>(null);

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

      const [tokenResult, profileResult] =
        await Promise.all([
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

      if (!tokenResult.error) {
        setTokenBalance(
          tokenResult.data?.reduce(
            (sum, row) =>
              sum + Number(row.amount || 0),
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

  const refreshAccess = useCallback(async () => {
    setStatus("checking");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.warn(
        "Could not check the current user:",
        userError.message,
      );
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
    await refreshBalances(user.id);

    const {
      data: learningProfileData,
      error: learningProfileError,
    } = await supabase.rpc(
      "get_my_learning_profile_status",
    );

    if (learningProfileError) {
      console.warn(
        "Could not check the learner profile:",
        learningProfileError.message,
      );
      setStatus("locked");
      return;
    }

    const resolvedLearningProfile =
      (learningProfileData || {}) as LearningProfileStatus;

    setLearningProfile(
      resolvedLearningProfile,
    );

    if (!resolvedLearningProfile.complete) {
      setStatus("profile_required");
      return;
    }

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
      profileResult.error ||
      !profileResult.data
    ) {
      console.warn(
        "Could not check Core Missions profile:",
        profileResult.error?.message,
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

    const role =
      profileResult.data.role ||
      profileResult.data.tier ||
      null;

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

    setStatus(
      entitlements.core || manuallyUnlocked
        ? "allowed"
        : "locked",
    );
  }, [refreshBalances]);

  useEffect(() => {
    void refreshAccess();
  }, [refreshAccess]);

  useEffect(() => {
    function handleRewardUpdate() {
      void refreshBalances();
    }

    function handleAccessUpdate() {
      void refreshAccess();
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
      handleAccessUpdate,
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
        handleAccessUpdate,
      );
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
