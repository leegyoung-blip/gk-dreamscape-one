"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

type LearningZone =
  | "core"
  | "science";

type GateStatus =
  | "checking"
  | "allowed"
  | "locked"
  | "logged-out";

type AccessRpcResult = {
  authenticated?: boolean;
  core?: boolean;
  science?: boolean;
  next_access_until?: string | null;
};

type CheckAccessOptions = {
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

      if (showChecking) {
        setStatus("checking");
      }

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

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

        if (!showChecking) {
          return;
        }
      }

      if (!user) {
        setStatus("logged-out");
        return;
      }

      /*
       * Canonical paid entitlement comes from a SECURITY
       * DEFINER RPC scoped to auth.uid().
       *
       * This avoids any mismatch between service-role
       * billing writes and browser-side RLS reads.
       */
      const [
        accessResult,
        manualAccessResult,
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
          .eq("zone_key", zone)
          .maybeSingle(),
      ]);

      if (
        cancelled ||
        requestId !== latestRequestId
      ) {
        return;
      }

      if (accessResult.error) {
        console.warn(
          `Could not check ${zone} paid entitlement:`,
          accessResult.error.message,
        );
      }

      if (manualAccessResult.error) {
        console.warn(
          `Could not check ${zone} manual access:`,
          manualAccessResult.error.message,
        );
      }

      const access =
        (accessResult.data ||
          {}) as AccessRpcResult;

      const entitlementAllowed =
        zone === "core"
          ? Boolean(access.core)
          : Boolean(access.science);

      const manualAccess =
        !manualAccessResult.error &&
        Boolean(
          manualAccessResult.data
            ?.is_unlocked,
        );

      if (
        entitlementAllowed ||
        manualAccess
      ) {
        setStatus("allowed");
      } else if (
        !showChecking &&
        (accessResult.error ||
          manualAccessResult.error)
      ) {
        /*
         * Never destroy an already-running mission because
         * one background entitlement read failed.
         */
      } else {
        setStatus("locked");
      }

      const expiry =
        access.next_access_until
          ? new Date(
              access.next_access_until,
            ).getTime()
          : NaN;

      if (
        Number.isFinite(expiry) &&
        expiry > Date.now()
      ) {
        const delay = Math.min(
          Math.max(
            expiry -
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

    void checkAccess({
      showChecking: true,
    });

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (event) => {
          if (
            event === "SIGNED_OUT"
          ) {
            latestRequestId += 1;
            clearExpiryTimer();
            setStatus("logged-out");
            return;
          }

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
