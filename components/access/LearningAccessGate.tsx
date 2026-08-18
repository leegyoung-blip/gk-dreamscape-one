"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import {
  getLearningEntitlements,
} from "@/lib/learning-access";
import { supabase } from "@/lib/supabase";

type LearningZone =
  | "core"
  | "science";

type GateStatus =
  | "checking"
  | "allowed"
  | "locked"
  | "logged-out";

type SubscriptionRow = {
  status: string | null;
  access_until: string | null;
  plan_code: string | null;
};

type CheckAccessOptions = {
  /**
   * Only true for the initial page-entry check.
   *
   * Background revalidation must not temporarily remove
   * children from the React tree.
   */
  showChecking?: boolean;
};

export default function LearningAccessGate({
  zone,
  children,
}: {
  zone: LearningZone;
  children: React.ReactNode;
}) {
  const [status, setStatus] =
    useState<GateStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    let expiryTimer:
      | number
      | null = null;

    /*
     * Used to reject stale async responses.
     */
    let latestRequestId = 0;

    function clearExpiryTimer() {
      if (expiryTimer !== null) {
        window.clearTimeout(
          expiryTimer,
        );

        expiryTimer = null;
      }
    }

    async function checkAccess(
      options: CheckAccessOptions = {},
    ) {
      const {
        showChecking = false,
      } = options;

      const requestId =
        ++latestRequestId;

      clearExpiryTimer();

      /*
       * CRITICAL:
       *
       * Only show the access-check screen when the user
       * FIRST enters this protected area.
       *
       * Focus/auth/expiry rechecks happen in the
       * background while children remain mounted.
       */
      if (showChecking) {
        setStatus("checking");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (
        cancelled ||
        requestId !== latestRequestId
      ) {
        return;
      }

      if (userError) {
        console.warn(
          `Could not check ${zone} authentication:`,
          userError.message,
        );

        /*
         * A background network/auth read error is not
         * proof that the learner's access disappeared.
         */
        if (!showChecking) {
          return;
        }
      }

      if (!user) {
        setStatus("logged-out");
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
          .eq("zone_key", zone)
          .maybeSingle(),
      ]);

      if (
        cancelled ||
        requestId !== latestRequestId
      ) {
        return;
      }

      if (
        profileResult.error ||
        !profileResult.data
      ) {
        console.warn(
          `Could not check ${zone} profile access:`,
          profileResult.error?.message,
        );

        /*
         * Fail closed when entering for the first time.
         * Do not destroy an already-running session because
         * of a transient background query failure.
         */
        if (showChecking) {
          setStatus("locked");
        }

        return;
      }

      if (subscriptionResult.error) {
        console.warn(
          `Could not check ${zone} subscription access:`,
          subscriptionResult.error.message,
        );
      }

      if (manualAccessResult.error) {
        console.warn(
          `Could not check ${zone} manual access:`,
          manualAccessResult.error.message,
        );
      }

      const subscriptionRows =
        subscriptionResult.error
          ? []
          : ((subscriptionResult.data ||
              []) as SubscriptionRow[]);

      const role =
        profileResult.data.role ||
        profileResult.data.tier ||
        null;

      const entitlements =
        getLearningEntitlements(
          role,
          subscriptionRows,
        );

      const manualAccess =
        !manualAccessResult.error &&
        Boolean(
          manualAccessResult.data
            ?.is_unlocked,
        );

      const entitlementAllowed =
        zone === "core"
          ? entitlements.core
          : entitlements.science;

      /*
       * If either source successfully proves access,
       * immediately keep/allow the page.
       */
      if (
        entitlementAllowed ||
        manualAccess
      ) {
        setStatus("allowed");
      } else if (
        !showChecking &&
        (subscriptionResult.error ||
          manualAccessResult.error)
      ) {
        /*
         * During background revalidation, incomplete data
         * is not enough evidence to revoke an existing
         * learning session.
         *
         * Leave the current status unchanged.
         */
      } else {
        /*
         * Both entitlement sources completed successfully
         * and neither grants access.
         */
        setStatus("locked");
      }

      /*
       * Schedule the next real subscription-expiry check.
       *
       * Importantly this future check is SILENT. It does not
       * first unmount the current quiz/game.
       */
      const futureExpiries =
        subscriptionRows
          .filter(
            (row) =>
              String(
                row.status || "",
              )
                .trim()
                .toLowerCase() ===
                "active" &&
              row.access_until,
          )
          .map((row) =>
            new Date(
              String(row.access_until),
            ).getTime(),
          )
          .filter(
            (value) =>
              Number.isFinite(value) &&
              value > Date.now(),
          )
          .sort(
            (a, b) =>
              a - b,
          );

      if (
        futureExpiries.length > 0
      ) {
        const delay = Math.min(
          Math.max(
            futureExpiries[0] -
              Date.now() +
              750,
            1000,
          ),
          2_147_000_000,
        );

        expiryTimer =
          window.setTimeout(() => {
            void checkAccess({
              showChecking: false,
            });
          }, delay);
      }
    }

    /*
     * First entry is allowed to display the access-check
     * screen.
     */
    void checkAccess({
      showChecking: true,
    });

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (event) => {
          /*
           * A confirmed sign-out should take effect
           * immediately.
           */
          if (
            event === "SIGNED_OUT"
          ) {
            latestRequestId += 1;
            clearExpiryTimer();
            setStatus("logged-out");
            return;
          }

          /*
           * TOKEN_REFRESHED, SIGNED_IN, USER_UPDATED etc.
           * should revalidate silently.
           *
           * setTimeout also keeps Supabase work outside the
           * auth callback itself.
           */
          window.setTimeout(() => {
            if (cancelled) {
              return;
            }

            void checkAccess({
              showChecking: false,
            });
          }, 0);
        },
      );

    function handleWindowFocus() {
      /*
       * Screenshot tools, Alt-Tab and switching windows can
       * fire focus.
       *
       * Revalidate security if desired, but NEVER change to
       * "checking" first.
       */
      void checkAccess({
        showChecking: false,
      });
    }

    window.addEventListener(
      "focus",
      handleWindowFocus,
    );

    return () => {
      cancelled = true;
      latestRequestId += 1;

      clearExpiryTimer();

      subscription.unsubscribe();

      window.removeEventListener(
        "focus",
        handleWindowFocus,
      );
    };
  }, [zone]);

  /*
   * Once access is allowed, background checks leave this
   * branch mounted unless access is actually revoked.
   *
   * That means the quiz/game React tree stays alive.
   */
  if (status === "allowed") {
    return <>{children}</>;
  }

  const zoneName =
    zone === "core"
      ? "Core Missions"
      : "Science Missions";

  return (
    <main className="grid min-h-screen place-items-center bg-[#020813] px-5 py-12 text-white">
      <section className="w-full max-w-xl rounded-[2rem] border border-cyan-200/20 bg-white/[0.055] p-7 text-center shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
          Dreamscape Student Access
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-[-0.05em]">
          {status === "checking"
            ? "Checking access…"
            : status ===
                "logged-out"
              ? "Log in to continue"
              : `${zoneName} are locked`}
        </h1>

        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/60">
          {status === "checking"
            ? "Dreamscape is checking the learning plan linked to this account."
            : status ===
                "logged-out"
              ? "Use the learner email connected to the paid subscription."
              : `This account does not currently have active ${zoneName} access.`}
        </p>

        {status !== "checking" && (
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link
              href={
                status ===
                "logged-out"
                  ? "/login"
                  : "/pricing"
              }
              className="flex min-h-12 items-center justify-center rounded-full border border-cyan-200/28 bg-cyan-300/14 px-5 text-sm font-extrabold text-white no-underline"
            >
              {status ===
              "logged-out"
                ? "Log In"
                : "View Plans"}
            </Link>

            <Link
              href="/learning-missions"
              className="flex min-h-12 items-center justify-center rounded-full border border-white/14 bg-white/[0.05] px-5 text-sm font-extrabold text-white no-underline"
            >
              Back to Missions
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}