"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getLearningEntitlements,
} from "@/lib/learning-access";
import { supabase } from "@/lib/supabase";

export type LearningMissionZoneKey = "core" | "think" | "science";

export type LearningMissionRouteAccessStatus =
  | "checking"
  | "allowed"
  | "signed_out"
  | "release_locked"
  | "entitlement_locked"
  | "error";

type NovaSubscriptionRow = {
  status: string | null;
  access_until: string | null;
  plan_code: string | null;
};

type GateState = {
  status: LearningMissionRouteAccessStatus;
  userId: string | null;
  role: string | null;
  isAdmin: boolean;
  learnerAccessEnabled: boolean;
  adminPreview: boolean;
  message: string;
};

const INITIAL_STATE: GateState = {
  status: "checking",
  userId: null,
  role: null,
  isAdmin: false,
  learnerAccessEnabled: false,
  adminPreview: false,
  message: "",
};

function normaliseRole(role: string | null | undefined) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function roleIsAdmin(role: string | null | undefined) {
  return normaliseRole(role) === "admin";
}

function getEntitlementMessage(zone: LearningMissionZoneKey) {
  if (zone === "science") {
    return "This account does not currently include Science Missions access.";
  }

  if (zone === "think") {
    return "This account does not currently include Core/Think Missions access.";
  }

  return "This account does not currently include Core Missions access.";
}

export function useLearningMissionRouteAccess(
  zone: LearningMissionZoneKey,
) {
  const [state, setState] = useState<GateState>(INITIAL_STATE);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const refresh = useCallback(() => {
    setRefreshNonce((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAccess() {
      setState((current) => ({
        ...current,
        status: "checking",
        message: "",
      }));

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError) {
        setState({
          ...INITIAL_STATE,
          status: "error",
          message: userError.message,
        });
        return;
      }

      if (!user) {
        setState({
          ...INITIAL_STATE,
          status: "signed_out",
        });
        return;
      }

      const [profileResult, subscriptionResult, manualAccessResult, releaseResult] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("nova_subscriptions")
            .select("status,access_until,plan_code")
            .eq("user_id", user.id),
          supabase
            .from("learning_mission_zone_access")
            .select("zone_key,is_unlocked")
            .eq("user_id", user.id)
            .eq("zone_key", zone)
            .maybeSingle(),
          supabase
            .from("learning_mission_zone_settings")
            .select("zone_key,learner_access_enabled")
            .eq("zone_key", zone)
            .maybeSingle(),
        ]);

      if (cancelled) return;

      if (profileResult.error) {
        setState({
          ...INITIAL_STATE,
          status: "error",
          userId: user.id,
          message: profileResult.error.message,
        });
        return;
      }

      if (releaseResult.error) {
        setState({
          ...INITIAL_STATE,
          status: "error",
          userId: user.id,
          role: profileResult.data?.role || null,
          message:
            "Could not verify whether this Learning Mission zone is currently released.",
        });
        return;
      }

      const role = profileResult.data?.role || null;
      const isAdmin = roleIsAdmin(role);

      // Fail closed if the global setting row is unexpectedly missing.
      const learnerAccessEnabled = Boolean(
        releaseResult.data?.learner_access_enabled,
      );

      // Admins always retain preview access, even while Learner Access is OFF.
      if (isAdmin) {
        setState({
          status: "allowed",
          userId: user.id,
          role,
          isAdmin: true,
          learnerAccessEnabled,
          adminPreview: !learnerAccessEnabled,
          message: "",
        });
        return;
      }

      if (!learnerAccessEnabled) {
        setState({
          status: "release_locked",
          userId: user.id,
          role,
          isAdmin: false,
          learnerAccessEnabled: false,
          adminPreview: false,
          message: `${zone === "science" ? "Science Missions" : zone === "think" ? "Think Missions" : "Core Missions"} are not currently open to learners.`,
        });
        return;
      }

      if (subscriptionResult.error) {
        setState({
          status: "error",
          userId: user.id,
          role,
          isAdmin: false,
          learnerAccessEnabled: true,
          adminPreview: false,
          message: "Could not verify your Student Access subscription.",
        });
        return;
      }

      const subscriptionRows = (subscriptionResult.data ||
        []) as NovaSubscriptionRow[];

      const entitlements = getLearningEntitlements(role, subscriptionRows);

      const manuallyUnlocked =
        !manualAccessResult.error &&
        Boolean(manualAccessResult.data?.is_unlocked);

      const entitled =
        zone === "science"
          ? entitlements.science || manuallyUnlocked
          : entitlements.core || manuallyUnlocked;

      if (!entitled) {
        setState({
          status: "entitlement_locked",
          userId: user.id,
          role,
          isAdmin: false,
          learnerAccessEnabled: true,
          adminPreview: false,
          message: getEntitlementMessage(zone),
        });
        return;
      }

      setState({
        status: "allowed",
        userId: user.id,
        role,
        isAdmin: false,
        learnerAccessEnabled: true,
        adminPreview: false,
        message: "",
      });
    }

    void loadAccess();

    return () => {
      cancelled = true;
    };
  }, [zone, refreshNonce]);

  useEffect(() => {
    function handleFocus() {
      refresh();
    }

    function handleReleaseUpdate() {
      refresh();
    }

    window.addEventListener("focus", handleFocus);
    window.addEventListener(
      "learning-mission-release-updated",
      handleReleaseUpdate,
    );

    const interval = window.setInterval(() => {
      refresh();
    }, 60_000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener(
        "learning-mission-release-updated",
        handleReleaseUpdate,
      );
      window.clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [refresh]);

  return useMemo(
    () => ({
      ...state,
      refresh,
    }),
    [state, refresh],
  );
}
