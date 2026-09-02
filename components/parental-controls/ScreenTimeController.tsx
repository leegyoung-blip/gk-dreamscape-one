"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type ScreenTimeStatus = {
  enabled: boolean;
  mode: "off" | "total" | "games";
  remainingSeconds: number | null;
  isLocked: boolean;
  resetsAt?: string;
  currentRouteIsGame?: boolean;
  currentRouteExcluded?: boolean;
};

const HEARTBEAT_MS = 15_000;
const IDLE_AFTER_MS = 2 * 60_000;
const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"] as const;

function isQuizRoute(pathname: string) {
  return pathname.split("/").some((part) => part === "quiz" || part === "quizId");
}

function formatResetTime(value?: string) {
  if (!value) return "midnight";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Singapore",
    timeZoneName: "short",
  }).format(new Date(value));
}

export default function ScreenTimeController() {
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);
  const [status, setStatus] = useState<ScreenTimeStatus | null>(null);
  const [warning, setWarning] = useState("");
  const [quizGrace, setQuizGrace] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const hasSeenStatusRef = useRef(false);
  const previouslyLockedRef = useRef(false);
  const warnedRef = useRef(new Set<number>());

  const heartbeat = useCallback(async () => {
    if (!authenticated) return;
    if (document.visibilityState !== "visible") return;
    if (Date.now() - lastActivityRef.current >= IDLE_AFTER_MS) return;

    try {
      const { data, error } = await supabase.rpc("record_my_screen_time", {
        p_route_path: pathname || "/",
      });
      if (error || !data) return;

      const next = data as ScreenTimeStatus;
      const transitionedToLocked =
        hasSeenStatusRef.current && !previouslyLockedRef.current && next.isLocked;

      if (
        transitionedToLocked
        && next.mode === "total"
        && isQuizRoute(pathname)
      ) {
        setQuizGrace(true);
      }

      hasSeenStatusRef.current = true;
      previouslyLockedRef.current = next.isLocked;
      setStatus(next);

      if (!next.isLocked && typeof next.remainingSeconds === "number") {
        for (const threshold of [60, 300]) {
          if (next.remainingSeconds <= threshold && !warnedRef.current.has(threshold)) {
            warnedRef.current.add(threshold);
            setWarning(
              threshold === 300
                ? "5 minutes of Dreamscape time remaining today."
                : "1 minute of Dreamscape time remaining today.",
            );
            window.setTimeout(() => setWarning(""), 8_000);
            break;
          }
        }
      }
    } catch {
      // A transient heartbeat failure must not interrupt the learner's current work.
    }
  }, [authenticated, pathname]);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setAuthenticated(Boolean(data.user));
        if (!data.user) setStatus(null);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(Boolean(session?.user));
      if (!session?.user) setStatus(null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    lastActivityRef.current = Date.now();
    hasSeenStatusRef.current = false;
    previouslyLockedRef.current = false;
    warnedRef.current.clear();
    setQuizGrace(false);
    void heartbeat();

    const markActive = () => {
      lastActivityRef.current = Date.now();
    };
    const finishQuiz = () => setQuizGrace(false);

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, markActive, { passive: true });
    }
    window.addEventListener("dreamscape:quiz-complete", finishQuiz);

    const timer = window.setInterval(() => void heartbeat(), HEARTBEAT_MS);
    return () => {
      window.clearInterval(timer);
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, markActive);
      }
      window.removeEventListener("dreamscape:quiz-complete", finishQuiz);
    };
  }, [heartbeat]);

  const routeIsControlled = Boolean(
    status?.enabled
    && !status.currentRouteExcluded
    && (status.mode === "total" || status.currentRouteIsGame),
  );
  const showLock = Boolean(status?.isLocked && routeIsControlled && !quizGrace);

  return (
    <>
      {warning && (
        <div role="status" className="fixed left-1/2 top-20 z-[1000] w-[min(92vw,480px)] -translate-x-1/2 rounded-2xl border border-amber-200/40 bg-[#201609]/95 px-5 py-4 text-center text-sm font-black text-amber-100 shadow-2xl backdrop-blur-xl">
          {warning}
        </div>
      )}

      {quizGrace && status?.isLocked && (
        <div role="status" className="fixed inset-x-3 top-20 z-[1000] mx-auto max-w-2xl rounded-2xl border border-amber-200/35 bg-[#201609]/95 px-5 py-4 text-center text-sm font-bold text-amber-100 shadow-2xl backdrop-blur-xl">
          Today’s limit has been reached. This quiz may be finished; Dreamscape will lock when it is submitted.
        </div>
      )}

      {showLock && (
        <div className="fixed inset-0 z-[2000] grid place-items-center bg-[#020611]/95 p-4 text-white backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="Daily screen-time limit reached">
          <section className="w-full max-w-lg rounded-3xl border border-cyan-300/25 bg-[#08172f] p-8 text-center shadow-2xl shadow-black/60">
            <p className="text-xs font-black tracking-[0.18em] text-cyan-200">DREAMSCAPE PAUSED</p>
            <h2 className="mt-3 text-3xl font-black">Today’s time is complete</h2>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              A parent can change the daily limit or grant extra time from the parent dashboard. Time resets at {formatResetTime(status?.resetsAt)}.
            </p>
            <Link href="/learning-missions/progress-rewards" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-6 font-black text-white">
              Open parent dashboard
            </Link>
          </section>
        </div>
      )}
    </>
  );
}
