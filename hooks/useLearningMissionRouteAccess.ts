"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getLearningEntitlements } from "@/lib/learning-access";
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

type RefreshOptions = {
  /**
   * Only the first page-entry check should show the checking screen.
   * Focus, screenshot/window changes, auth token refreshes and the
   * periodic release check must stay silent so a live quiz/game remains
   * mounted.
   */
  showChecking?: boolean;
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

function getZoneName(zone: LearningMissionZoneKey) {
  if (zone === "science") return "Science Missions";
  if (zone === "think") return "Think Missions";
  return "Core Missions";
}

export function useLearningMissionRouteAccess(
  zone: LearningMissionZoneKey,
) {
  const [state, setState] = useState<GateState>(INITIAL_STATE);

  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, []);

  const refreshAccess = useCallback(
    async (options: RefreshOptions = {}) => {
      const { showChecking = false } = options;
      const requestId = ++requestIdRef.current;

      /*
       * CRITICAL SESSION-PRESERVATION RULE:
       *
       * Never replace an already-mounted mission with a checking screen
       * during a background revalidation. That was the cause of quizzes
       * and Rover sessions appearing to restart after Alt-Tab, screenshots,
       * token refreshes, or the periodic access check.
       */
      if (showChecking && mountedRef.current) {
        setState((current) => ({
          ...current,
          status: "checking",
          message: "",
        }));
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (
        !mountedRef.current ||
        requestId !== requestIdRef.current
      ) {
        return;
      }

      if (userError) {
        console.warn(
          `Could not check ${zone} authentication:`,
          userError.message,
        );

        if (!showChecking) {
          // A transient background auth/network read is not proof that the
          // learner lost access. Keep the live experience mounted.
          return;
        }

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

      const [
        profileResult,
        subscriptionResult,
        manualAccessResult,
        releaseResult,
      ] = await Promise.all([
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

      if (
        !mountedRef.current ||
        requestId !== requestIdRef.current
      ) {
        return;
      }

      if (profileResult.error || !profileResult.data) {
        console.warn(
          `Could not check ${zone} profile access:`,
          profileResult.error?.message,
        );

        if (!showChecking) {
          return;
        }

        setState({
          ...INITIAL_STATE,
          status: "error",
          userId: user.id,
          message:
            profileResult.error?.message ||
            "Dreamscape could not verify this account profile.",
        });
        return;
      }

      if (releaseResult.error) {
        console.warn(
          `Could not check ${zone} release state:`,
          releaseResult.error.message,
        );

        if (!showChecking) {
          return;
        }

        setState({
          ...INITIAL_STATE,
          status: "error",
          userId: user.id,
          role: profileResult.data.role || null,
          message:
            "Could not verify whether this Learning Mission zone is currently released.",
        });
        return;
      }

      const role = profileResult.data.role || null;
      const isAdmin = roleIsAdmin(role);
      const learnerAccessEnabled = Boolean(
        releaseResult.data?.learner_access_enabled,
      );

      // Administrators always retain preview access, even while learner
      // release is disabled globally.
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

      // A successfully verified global lock is a real access change and may
      // replace the live experience.
      if (!learnerAccessEnabled) {
        setState({
          status: "release_locked",
          userId: user.id,
          role,
          isAdmin: false,
          learnerAccessEnabled: false,
          adminPreview: false,
          message: `${getZoneName(zone)} are not currently open to learners.`,
        });
        return;
      }

      if (subscriptionResult.error) {
        console.warn(
          `Could not check ${zone} subscription access:`,
          subscriptionResult.error.message,
        );

        if (!showChecking) {
          // Do not eject a learner from a running session because a
          // background subscription query temporarily failed.
          return;
        }

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

      const entitlements = getLearningEntitlements(
        role,
        subscriptionRows,
      );

      const manualAccessKnown = !manualAccessResult.error;
      const manuallyUnlocked =
        manualAccessKnown &&
        Boolean(manualAccessResult.data?.is_unlocked);

      const entitlementAllowed =
        zone === "science"
          ? entitlements.science
          : entitlements.core;

      if (entitlementAllowed || manuallyUnlocked) {
        setState({
          status: "allowed",
          userId: user.id,
          role,
          isAdmin: false,
          learnerAccessEnabled: true,
          adminPreview: false,
          message: "",
        });
        return;
      }

      if (!manualAccessKnown) {
        console.warn(
          `Could not check ${zone} manual access:`,
          manualAccessResult.error?.message,
        );

        if (!showChecking) {
          // The subscription does not prove access, but the fallback/manual
          // source failed. Preserve an existing live session until access can
          // be verified reliably.
          return;
        }
      }

      // Both access sources completed successfully and neither grants entry.
      setState({
        status: "entitlement_locked",
        userId: user.id,
        role,
        isAdmin: false,
        learnerAccessEnabled: true,
        adminPreview: false,
        message: getEntitlementMessage(zone),
      });
    },
    [zone],
  );

  /* Initial page entry: this is the only normal check allowed to show UI. */
  useEffect(() => {
    void refreshAccess({ showChecking: true });
  }, [refreshAccess]);

  useEffect(() => {
    function silentRefresh() {
      void refreshAccess({ showChecking: false });
    }

    function handleFocus() {
      // Screenshots, Alt-Tab and switching browser tabs can fire focus.
      // Revalidate silently and keep children mounted.
      silentRefresh();
    }

    function handleReleaseUpdate() {
      silentRefresh();
    }

    window.addEventListener("focus", handleFocus);
    window.addEventListener(
      "learning-mission-release-updated",
      handleReleaseUpdate,
    );

    const interval = window.setInterval(() => {
      silentRefresh();
    }, 60_000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        requestIdRef.current += 1;

        if (mountedRef.current) {
          setState({
            ...INITIAL_STATE,
            status: "signed_out",
          });
        }
        return;
      }

      // Keep Supabase work outside the auth callback and never flash the
      // checking screen for SIGNED_IN/TOKEN_REFRESHED/USER_UPDATED events.
      window.setTimeout(() => {
        if (mountedRef.current) {
          silentRefresh();
        }
      }, 0);
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
  }, [refreshAccess]);

  const refresh = useCallback(() => {
    void refreshAccess({ showChecking: true });
  }, [refreshAccess]);

  return useMemo(
    () => ({
      ...state,
      refresh,
    }),
    [state, refresh],
  );
}
