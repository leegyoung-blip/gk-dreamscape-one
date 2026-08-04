"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type ScienceAccessStatus =
  | "checking"
  | "signed_out"
  | "profile_required"
  | "allowed"
  | "locked";

type LearningProfileStatus = {
  complete?: boolean;
  date_of_birth?: string | null;
  age_years?: number | null;
  age_band?: string | null;
};

function normaliseRole(role: string | null | undefined) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

function roleHasFullScienceAccess(role: string | null | undefined) {
  const cleanRole = normaliseRole(role);

  return (
    cleanRole === "admin" ||
    cleanRole === "student" ||
    cleanRole === "teacher" ||
    cleanRole === "curriculum-lead"
  );
}

export function useScienceMissionAccess() {
  const [status, setStatus] =
    useState<ScienceAccessStatus>("checking");
  const [userId, setUserId] = useState<string | null>(null);
  const [learningProfile, setLearningProfile] =
    useState<LearningProfileStatus | null>(null);

  const refreshAccess = useCallback(async () => {
    setStatus("checking");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUserId(null);
      setLearningProfile(null);
      setStatus("signed_out");
      return;
    }

    setUserId(user.id);

    const { data: profileStatus, error: profileStatusError } =
      await supabase.rpc("get_my_learning_profile_status");

    if (profileStatusError) {
      console.warn(
        "Could not check the learner profile:",
        profileStatusError.message,
      );
      setStatus("locked");
      return;
    }

    const resolvedLearningProfile =
      (profileStatus || {}) as LearningProfileStatus;

    setLearningProfile(resolvedLearningProfile);

    if (!resolvedLearningProfile.complete) {
      setStatus("profile_required");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role,tier")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      setStatus("locked");
      return;
    }

    const role = profile.role || profile.tier || null;

    if (!roleHasFullScienceAccess(role)) {
      const { data: accessRow, error: accessError } = await supabase
        .from("learning_mission_zone_access")
        .select("is_unlocked")
        .eq("user_id", user.id)
        .eq("zone_key", "science")
        .maybeSingle();

      if (accessError || !accessRow?.is_unlocked) {
        setStatus("locked");
        return;
      }
    }

    setStatus("allowed");
  }, []);

  useEffect(() => {
    void refreshAccess();
  }, [refreshAccess]);

  useEffect(() => {
    function handleProfileRefresh() {
      void refreshAccess();
    }

    window.addEventListener(
      "learning-profile-updated",
      handleProfileRefresh,
    );
    window.addEventListener("focus", handleProfileRefresh);

    return () => {
      window.removeEventListener(
        "learning-profile-updated",
        handleProfileRefresh,
      );
      window.removeEventListener("focus", handleProfileRefresh);
    };
  }, [refreshAccess]);

  return {
    status,
    userId,
    learningProfile,
    refreshAccess,
  };
}
