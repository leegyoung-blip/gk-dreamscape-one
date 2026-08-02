"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getLearningEntitlements,
  normaliseRole,
} from "@/lib/learning-access";
import { supabase } from "@/lib/supabase";

type LearningZone = "core" | "science";
type GateStatus = "checking" | "allowed" | "locked" | "logged-out";

type SubscriptionRow = {
  status: string | null;
  access_until: string | null;
  plan_code: string | null;
};

export default function LearningAccessGate({
  zone,
  children,
}: {
  zone: LearningZone;
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<GateStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      setStatus("checking");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        setStatus("logged-out");
        return;
      }

      const [profileResult, subscriptionResult, manualAccessResult] =
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
            .select("is_unlocked")
            .eq("user_id", user.id)
            .eq("zone_key", zone)
            .maybeSingle(),
        ]);

      if (cancelled) return;

      if (profileResult.error || !profileResult.data) {
        console.warn(
          `Could not check ${zone} profile access:`,
          profileResult.error?.message,
        );
        setStatus("locked");
        return;
      }

      if (subscriptionResult.error) {
        console.warn(
          `Could not check ${zone} subscription access:`,
          subscriptionResult.error.message,
        );
      }

      const entitlements = getLearningEntitlements(
        profileResult.data.role,
        subscriptionResult.error
          ? []
          : ((subscriptionResult.data || []) as SubscriptionRow[]),
      );

      const manualAccess =
        !manualAccessResult.error &&
        Boolean(manualAccessResult.data?.is_unlocked);

      const allowed =
        zone === "core"
          ? entitlements.core || manualAccess
          : entitlements.science || manualAccess;

      setStatus(allowed ? "allowed" : "locked");
    }

    void checkAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void checkAccess();
    });

    window.addEventListener("focus", checkAccess);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener("focus", checkAccess);
    };
  }, [zone]);

  if (status === "allowed") {
    return <>{children}</>;
  }

  const zoneName = zone === "core" ? "Core Missions" : "Science Missions";

  return (
    <main className="grid min-h-screen place-items-center bg-[#020813] px-5 py-12 text-white">
      <section className="w-full max-w-xl rounded-[2rem] border border-cyan-200/20 bg-white/[0.055] p-7 text-center shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
          Dreamscape Student Access
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-[-0.05em]">
          {status === "checking"
            ? "Checking access…"
            : status === "logged-out"
              ? "Log in to continue"
              : `${zoneName} are locked`}
        </h1>

        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/60">
          {status === "checking"
            ? "Dreamscape is checking the learning plan linked to this account."
            : status === "logged-out"
              ? "Use the learner email connected to the paid subscription."
              : `This account does not currently have active ${zoneName} access.`}
        </p>

        {status !== "checking" && (
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link
              href={status === "logged-out" ? "/login" : "/pricing"}
              className="flex min-h-12 items-center justify-center rounded-full border border-cyan-200/28 bg-cyan-300/14 px-5 text-sm font-extrabold text-white no-underline"
            >
              {status === "logged-out" ? "Log In" : "View Plans"}
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
