"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { isPublicPreviewActive } from "@/lib/public-preview";

type Recommendation = {
  eyebrow: string;
  title: string;
  text: string;
  buttonLabel: string;
  href: string;
  accent: string;
};

const LAST_WELCOME_MARKER_KEY = "dreamscape-last-login-welcome-v1";
const RECENT_SIGN_IN_WINDOW_MS = 10 * 60 * 1000;

function normaliseRole(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
}

function calculateAge(dateOfBirth: string | null | undefined) {
  if (!dateOfBirth) return null;

  const birthDate = new Date(`${dateOfBirth}T00:00:00`);
  const today = new Date();

  if (Number.isNaN(birthDate.getTime())) return null;

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function markerFor(user: User) {
  return `${user.id}:${user.last_sign_in_at || user.updated_at || "session"}`;
}

function signInWasRecent(user: User) {
  const value = user.last_sign_in_at;
  if (!value) return false;

  const signedInAt = new Date(value).getTime();
  return Number.isFinite(signedInAt) && Date.now() - signedInAt <= RECENT_SIGN_IN_WINDOW_MS;
}

export default function PostLoginWelcome() {
  const router = useRouter();
  const pathname = usePathname();
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [open, setOpen] = useState(false);

  const routeTemporarilyBlocksPopup = useMemo(
    () =>
      pathname.startsWith("/login") ||
      pathname.startsWith("/complete-profile") ||
      pathname.startsWith("/login/reset-password"),
    [pathname],
  );

  useEffect(() => {
    let cancelled = false;

    async function prepareForUser(user: User, forceFromAuthEvent: boolean) {
      if (!isPublicPreviewActive()) return;

      const marker = markerFor(user);
      const alreadyShown = window.localStorage.getItem(LAST_WELCOME_MARKER_KEY);

      if (alreadyShown === marker) return;
      if (!forceFromAuthEvent && !signInWasRecent(user)) return;

      const [profileResult, linkedLearnerResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("role,date_of_birth")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("learning_dashboard_access")
          .select("student_user_id")
          .eq("viewer_user_id", user.id)
          .neq("student_user_id", user.id)
          .limit(1),
      ]);

      if (cancelled) return;

      const role = normaliseRole(profileResult.data?.role) || "regular";
      const age = calculateAge(profileResult.data?.date_of_birth);
      const isStaff = ["admin", "teacher", "curriculum-lead"].includes(role);
      const hasLinkedLearner =
        !linkedLearnerResult.error && (linkedLearnerResult.data?.length || 0) > 0;

      let next: Recommendation | null = null;

      if (isStaff) {
        next = {
          eyebrow: "Nova for Educators",
          title: "Welcome back to Dreamscape.",
          text:
            "Review learner activity, Nova analytics and recent Learning Mission results.",
          buttonLabel: "Open Nova Insights",
          href: "/learning-missions/progress-rewards",
          accent: "#8ee8ff",
        };
      } else if (hasLinkedLearner) {
        next = {
          eyebrow: "Nova for Parents",
          title: "See how your learner is progressing.",
          text:
            "Review recent activity, results and the areas Nova recommends focusing on next.",
          buttonLabel: "Open Nova Insights",
          href: "/learning-missions/progress-rewards",
          accent: "#8ee8ff",
        };
      } else if (age !== null && age < 13) {
        next = {
          eyebrow: "Recommended for You",
          title: "Continue in Nova’s World.",
          text:
            "Try a free thinking activity, explore learning missions and earn Dream Tokens.",
          buttonLabel: "Enter Nova’s World",
          href: "/inventor",
          accent: "#53d7ff",
        };
      } else if (age !== null && age >= 13) {
        next = {
          eyebrow: "Recommended for You",
          title: "Explore Milo’s World.",
          text:
            "Try daily challenges, multiplayer quizzes and real-world decision-making activities.",
          buttonLabel: "Enter Milo’s World",
          href: "/milo-world",
          accent: "#c58cff",
        };
      }

      // The current login and complete-profile flow already handles missing DOB.
      // Wait for that flow to finish instead of displaying a competing popup.
      if (!next) return;

      window.localStorage.setItem(LAST_WELCOME_MARKER_KEY, marker);
      setRecommendation(next);
      setOpen(true);
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        void prepareForUser(data.session.user, false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setOpen(false);
        setRecommendation(null);
        return;
      }

      if (event === "SIGNED_IN" && session?.user) {
        window.setTimeout(() => {
          void prepareForUser(session.user, true);
        }, 0);
      }
    });

    function retryAfterProfileCompletion() {
      void supabase.auth.getUser().then(({ data }) => {
        if (data.user) void prepareForUser(data.user, true);
      });
    }

    window.addEventListener("learning-profile-updated", retryAfterProfileCompletion);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener(
        "learning-profile-updated",
        retryAfterProfileCompletion,
      );
    };
  }, []);

  if (!open || !recommendation || routeTemporarilyBlocksPopup) return null;

  function close() {
    setOpen(false);
  }

  function continueToRecommendation() {
    close();
    router.push(recommendation!.href);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-login-welcome-title"
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 180,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "18px",
        background: "rgba(1,4,11,0.74)",
        backdropFilter: "blur(12px)",
      }}
    >
      <section
        onClick={(event) => event.stopPropagation()}
        style={{
          position: "relative",
          width: "min(570px, 100%)",
          padding: "38px 28px 28px",
          borderRadius: "30px",
          border: `1px solid ${recommendation.accent}55`,
          background:
            "radial-gradient(circle at 12% 0%, rgba(83,215,255,0.14), transparent 34%), radial-gradient(circle at 100% 100%, rgba(197,140,255,0.14), transparent 38%), #071326",
          boxShadow: "0 32px 100px rgba(0,0,0,0.58)",
          color: "white",
          textAlign: "center",
        }}
      >
        <button
          type="button"
          aria-label="Close welcome recommendation"
          onClick={close}
          style={{
            position: "absolute",
            top: "13px",
            right: "13px",
            width: "38px",
            height: "38px",
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            fontSize: "22px",
            cursor: "pointer",
          }}
        >
          ×
        </button>

        <p
          style={{
            margin: 0,
            color: recommendation.accent,
            fontSize: "11px",
            fontWeight: 900,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          {recommendation.eyebrow}
        </p>

        <h2
          id="post-login-welcome-title"
          style={{
            margin: "17px 0 0",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: "clamp(36px, 8vw, 49px)",
            fontWeight: 400,
            lineHeight: 1.08,
          }}
        >
          {recommendation.title}
        </h2>

        <p
          style={{
            margin: "20px auto 0",
            maxWidth: "460px",
            color: "rgba(255,255,255,0.72)",
            fontSize: "16px",
            lineHeight: 1.65,
          }}
        >
          {recommendation.text}
        </p>

        <div
          style={{
            marginTop: "27px",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={continueToRecommendation}
            style={{
              minHeight: "52px",
              padding: "13px 22px",
              border: "none",
              borderRadius: "999px",
              background: `linear-gradient(90deg, ${recommendation.accent}, #c58cff)`,
              color: "#140725",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            {recommendation.buttonLabel}
          </button>

          <button
            type="button"
            onClick={close}
            style={{
              minHeight: "52px",
              padding: "13px 22px",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.05)",
              color: "white",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Maybe Later
          </button>
        </div>
      </section>
    </div>
  );
}
