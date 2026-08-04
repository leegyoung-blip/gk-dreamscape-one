"use client";

import { useCallback, useEffect, useState } from "react";
import { getLearningEntitlements } from "@/lib/learning-access";
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

export function useScienceMissionAccess() {
  const [status, setStatus] =
    useState<ScienceAccessStatus>("checking");
  const [userId, setUserId] =
    useState<string | null>(null);
  const [learningProfile, setLearningProfile] =
    useState<LearningProfileStatus | null>(null);

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
      setStatus("signed_out");
      return;
    }

    setUserId(user.id);

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
        .eq("zone_key", "science")
        .maybeSingle(),
    ]);

    if (
      profileResult.error ||
      !profileResult.data
    ) {
      console.warn(
        "Could not check Science Missions profile:",
        profileResult.error?.message,
      );
      setStatus("locked");
      return;
    }

    if (subscriptionResult.error) {
      console.warn(
        "Could not check Science subscription:",
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
      entitlements.science ||
        manuallyUnlocked
        ? "allowed"
        : "locked",
    );
  }, []);

  useEffect(() => {
    void refreshAccess();
  }, [refreshAccess]);

  useEffect(() => {
    function handleAccessUpdate() {
      void refreshAccess();
    }

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
        "learning-profile-updated",
        handleAccessUpdate,
      );
      window.removeEventListener(
        "focus",
        handleAccessUpdate,
      );
    };
  }, [refreshAccess]);

  return {
    status,
    userId,
    learningProfile,
    refreshAccess,
  };
}
