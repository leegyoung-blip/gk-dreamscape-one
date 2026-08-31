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

type BalanceRpcRow = {
  token_balance?: number | string | null;
  gem_balance?: number | string | null;
};

type RefreshAccessOptions = {
  /**
   * Only true when there is no recent access snapshot.
   * Background checks remain silent so quizzes/games are not reset.
   */
  showChecking?: boolean;
};

type AccessCache = {
  status: CoreAccessStatus;
  userId: string | null;
  role: string | null;
  learningProfile: LearningProfileStatus | null;
  savedAt: number;
};

const ACCESS_CACHE_MS = 45_000;
let accessCache: AccessCache | null = null;

function getFreshAccessCache() {
  if (!accessCache) return null;

  if (Date.now() - accessCache.savedAt > ACCESS_CACHE_MS) {
    accessCache = null;
    return null;
  }

  return accessCache;
}

function clearAccessCache() {
  accessCache = null;
}

export function useCoreMissionAccess() {
  const initialCacheRef = useRef<AccessCache | null>(
    getFreshAccessCache(),
  );

  const [status, setStatus] =
    useState<CoreAccessStatus>(
      initialCacheRef.current?.status || "checking",
    );

  const [userId, setUserId] =
    useState<string | null>(
      initialCacheRef.current?.userId || null,
    );

  const [role, setRole] =
    useState<string | null>(
      initialCacheRef.current?.role || null,
    );

  const [tokenBalance, setTokenBalance] =
    useState(0);

  const [dreamGemBalance, setDreamGemBalance] =
    useState(0);

  const [learningProfile, setLearningProfile] =
    useState<LearningProfileStatus | null>(
      initialCacheRef.current?.learningProfile || null,
    );

  const accessRequestIdRef = useRef(0);
  const balanceRequestIdRef = useRef(0);

  const commitAccessState = useCallback(
    ({
      nextStatus,
      nextUserId,
      nextRole,
      nextLearningProfile,
    }: {
      nextStatus: CoreAccessStatus;
      nextUserId: string | null;
      nextRole: string | null;
      nextLearningProfile: LearningProfileStatus | null;
    }) => {
      setStatus(nextStatus);
      setUserId(nextUserId);
      setRole(nextRole);
      setLearningProfile(nextLearningProfile);

      accessCache = {
        status: nextStatus,
        userId: nextUserId,
        role: nextRole,
        learningProfile: nextLearningProfile,
        savedAt: Date.now(),
      };
    },
    [],
  );

  const refreshBalances = useCallback(
    async (activeUserId?: string) => {
      const requestId =
        ++balanceRequestIdRef.current;

      let resolvedUserId = activeUserId;

      if (!resolvedUserId) {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (
          requestId !==
          balanceRequestIdRef.current
        ) {
          return;
        }

        if (error) {
          console.warn(
            "Could not resolve session while refreshing balances:",
            error.message,
          );
          return;
        }

        resolvedUserId = session?.user?.id;
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

      const { data, error } = await supabase.rpc(
        "get_my_dreamscape_balances",
      );

      if (
        requestId !==
        balanceRequestIdRef.current
      ) {
        return;
      }

      if (error) {
        console.warn(
          "Could not load Dreamscape balances:",
          error.message,
        );
        return;
      }

      const raw = Array.isArray(data)
        ? data[0]
        : data;

      const row = (raw || {}) as BalanceRpcRow;

      setTokenBalance(
        Math.max(
          0,
          Number(row.token_balance || 0),
        ),
      );

      setDreamGemBalance(
        Math.max(
          0,
          Number(row.gem_balance || 0),
        ),
      );
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

      /*
       * getSession() is local/cache-backed and avoids a network round-trip
       * that getUser() performs on every page mount. Security still lives in
       * the database/RLS/RPC layer; this is only resolving the current UI user.
       */
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (
        requestId !==
        accessRequestIdRef.current
      ) {
        return;
      }

      if (sessionError) {
        console.warn(
          "Could not check the current session:",
          sessionError.message,
        );

        if (!showChecking) {
          return;
        }
      }

      const user = session?.user || null;

      if (!user) {
        setTokenBalance(0);
        setDreamGemBalance(0);

        commitAccessState({
          nextStatus: "signed_out",
          nextUserId: null,
          nextRole: null,
          nextLearningProfile: null,
        });
        return;
      }

      setUserId(user.id);

      /*
       * Balances are independent UI data. They run in parallel and never gate
       * access or catalogue rendering.
       */
      void refreshBalances(user.id);

      /*
       * Run the access reads together rather than waiting for profile -> paid
       * access -> manual access/profile status in separate serial phases.
       */
      const [
        profileResult,
        accessResult,
        manualAccessResult,
        learningProfileResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("role,tier")
          .eq("id", user.id)
          .maybeSingle(),

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

      if (profileResult.error) {
        console.warn(
          "Could not check Core Missions profile:",
          profileResult.error.message,
        );
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
        (accessResult.data || {}) as AccessRpcResult;

      const resolvedRole =
        profileResult.data?.role ||
        profileResult.data?.tier ||
        access.role ||
        null;

      const resolvedLearningProfile =
        !learningProfileResult.error
          ? ((learningProfileResult.data ||
              {}) as LearningProfileStatus)
          : null;

      /*
       * Existing staff learning override remains intact.
       */
      if (
        roleHasStaffLearningAccess(resolvedRole) ||
        Boolean(access.is_staff)
      ) {
        commitAccessState({
          nextStatus: "allowed",
          nextUserId: user.id,
          nextRole: resolvedRole,
          nextLearningProfile: resolvedLearningProfile,
        });
        return;
      }

      const manuallyUnlocked =
        !manualAccessResult.error &&
        Boolean(
          manualAccessResult.data?.is_unlocked,
        );

      if (
        Boolean(access.core) ||
        manuallyUnlocked
      ) {
        commitAccessState({
          nextStatus: "allowed",
          nextUserId: user.id,
          nextRole: resolvedRole,
          nextLearningProfile: resolvedLearningProfile,
        });
        return;
      }

      /*
       * During a silent/background recheck, a temporary access read failure is
       * not enough evidence to remove a learner from a running activity.
       */
      if (
        !showChecking &&
        (accessResult.error ||
          manualAccessResult.error)
      ) {
        return;
      }

      if (learningProfileResult.error) {
        if (showChecking) {
          commitAccessState({
            nextStatus: "locked",
            nextUserId: user.id,
            nextRole: resolvedRole,
            nextLearningProfile: null,
          });
        }

        return;
      }

      if (!resolvedLearningProfile?.complete) {
        commitAccessState({
          nextStatus: "profile_required",
          nextUserId: user.id,
          nextRole: resolvedRole,
          nextLearningProfile: resolvedLearningProfile,
        });
        return;
      }

      commitAccessState({
        nextStatus: "locked",
        nextUserId: user.id,
        nextRole: resolvedRole,
        nextLearningProfile: resolvedLearningProfile,
      });
    },
    [commitAccessState, refreshBalances],
  );

  /*
   * A recent snapshot allows navigation between Core pages to render
   * immediately. A silent refresh still verifies access in the background.
   */
  useEffect(() => {
    if (initialCacheRef.current) {
      void refreshAccess({
        showChecking: false,
      });
    } else {
      void refreshAccess({
        showChecking: true,
      });
    }
  }, [refreshAccess]);

  useEffect(() => {
    function handleRewardUpdate() {
      void refreshBalances();
    }

    function handleAccessUpdate() {
      clearAccessCache();
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
          if (event === "SIGNED_OUT") {
            accessRequestIdRef.current += 1;
            balanceRequestIdRef.current += 1;
            clearAccessCache();
            setUserId(null);
            setRole(null);
            setLearningProfile(null);
            setTokenBalance(0);
            setDreamGemBalance(0);
            setStatus("signed_out");
            return;
          }

          if (event === "SIGNED_IN") {
            clearAccessCache();
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
    role,
    tokenBalance,
    dreamGemBalance,
    learningProfile,
    refreshBalances,
    refreshAccess,
  };
}
