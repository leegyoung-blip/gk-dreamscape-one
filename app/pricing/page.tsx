"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import { isPublicPreviewActive } from "@/lib/public-preview";

type PricingView = "monthly" | "annual";
type PublicPlanKey = "core" | "nova" | "full";

const STAFF_CHECKOUT_ROLES = new Set([
  "admin",
  "teacher",
  "curriculum_lead",
]);

const STANDARD_TRIAL_DAYS = 7;

function normaliseRole(role: string | null | undefined) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

type Plan = {
  key: PublicPlanKey;
  name: string;
  eyebrow: string;
  description: string;
  features: string[];
  accent: string;
  featured?: boolean;
  badge?: string;
  comingSoon?: boolean;
  monthlyPrice?: number;
  annualPrice?: number;
  regularMonthlyPrice?: number;
  regularAnnualPrice?: number;
  trialEligible?: boolean;
};

const plans: Plan[] = [
  {
    key: "core",
    name: "Core Missions",
    eyebrow: "English + Mathematics",
    monthlyPrice: 19.9,
    annualPrice: 199,
    regularMonthlyPrice: 24.9,
    regularAnnualPrice: 249,
    description:
      "Structured English and Mathematics learning across Dreamscape, with curriculum practice, thinking activities, rewards and clear progress tracking.",
    features: [
      "Primary 1–6 English Learning Missions",
      "Primary 1–6 Mathematics Learning Missions",
      "Think Lab and Knowledge Arena access",
      "Topic mastery and progress insights",
      "Dream Token and Dream Gem rewards",
      "Regular content and platform updates",
    ],
    accent: "#c58cff",
    badge: "Launch Price",
    trialEligible: true,
  },
  {
    key: "nova",
    name: "NOVA+",
    eyebrow: "Learning Intelligence",
    monthlyPrice: 24.9,
    annualPrice: 249,
    regularMonthlyPrice: 29.9,
    regularAnnualPrice: 299,
    description:
      "Core Missions plus NOVA+ learning intelligence for families who want a clearer view of progress, strengths, gaps, mastery and what to work on next.",
    features: [
      "Everything in Core Missions",
      "My Learning weekly intelligence",
      "Concept-level Strengths & Gaps",
      "Curriculum Mastery Map",
      "Personalised Nova recommendations",
      "Downloadable parent learning reports",
    ],
    accent: "#8ee8ff",
    featured: true,
    badge: "Launch Price",
    trialEligible: true,
  },
  {
    key: "full",
    name: "Full Access",
    eyebrow: "English + Mathematics + Science + NOVA+",
    description:
      "The complete Dreamscape learning membership, bringing all three Primary subjects together with the full NOVA+ learning-intelligence experience.",
    features: [
      "Everything in NOVA+",
      "Primary 1–6 Science Learning Missions",
      "Science topic quizzes and mixed assessments",
      "Science mastery tracking",
      "Three-subject learning profile",
      "NOVA+ intelligence across the complete profile",
    ],
    accent: "#ffae5c",
    badge: "Coming Soon",
    comingSoon: true,
  },
];

const comparisonRows = [
  {
    feature: "Primary English missions",
    core: true,
    nova: true,
    full: true,
  },
  {
    feature: "Primary Mathematics missions",
    core: true,
    nova: true,
    full: true,
  },
  {
    feature: "Primary Science missions",
    core: false,
    nova: false,
    full: true,
  },
  {
    feature: "Think Lab and Knowledge Arena",
    core: true,
    nova: true,
    full: true,
  },
  {
    feature: "Topic mastery and progress insights",
    core: true,
    nova: true,
    full: true,
  },
  {
    feature: "NOVA+ My Learning",
    core: false,
    nova: true,
    full: true,
  },
  {
    feature: "Concept-level Strengths & Gaps",
    core: false,
    nova: true,
    full: true,
  },
  {
    feature: "Curriculum Mastery Map",
    core: false,
    nova: true,
    full: true,
  },
  {
    feature: "Personalised recommendations",
    core: false,
    nova: true,
    full: true,
  },
  {
    feature: "Downloadable learning reports",
    core: false,
    nova: true,
    full: true,
  },
];

const faqItems = [
  {
    question: "How does the 7-day free trial work?",
    answer:
      `Eligible first-time Dreamscape users can start Core Missions or NOVA+ with ${STANDARD_TRIAL_DAYS} days free. The selected paid subscription begins after the trial unless it is cancelled before the trial ends. The introductory trial may be redeemed once per eligible first-time user.`,
  },
  {
    question: "Who should purchase a student plan?",
    answer:
      "A parent or guardian should purchase or authorise paid access for users below 18. The learner may still use their own supervised Dreamscape account.",
  },
  {
    question: "Can I change plans later?",
    answer:
      "Plan changes may be offered through the account or billing portal. Any price difference, remaining term or upgrade conditions will be shown before confirmation.",
  },
  {
    question: "What does the annual option mean?",
    answer:
      "Annual access is paid upfront for a 12-month subscription after the 7-day introductory trial for eligible first-time users. Core Missions is SGD 199 per year at launch instead of its SGD 249 regular annual price. NOVA+ is SGD 249 per year at launch instead of its SGD 299 regular annual price.",
  },
  {
    question: "What is NOVA+?",
    answer:
      "NOVA+ combines Core Missions with Dreamscape learning intelligence: My Learning, concept-level Strengths & Gaps, the Mastery Map, personalised Nova recommendations and downloadable parent learning reports. Science is not included in the standalone NOVA+ tier.",
  },
  {
    question: "What will NOVA+ cost?",
    answer:
      "NOVA+ is SGD 24.90 per month or SGD 249 per year at launch. Its regular prices are SGD 29.90 per month and SGD 299 per year.",
  },
  {
    question: "What is Full Access?",
    answer:
      "Full Access will combine English, Mathematics, Science and NOVA+ in one complete membership. It is Coming Soon and no public price is being displayed yet.",
  },
  {
    question: "How are payments processed?",
    answer:
      "Dreamscape subscriptions are processed securely by Stripe. Checkout shows the selected plan, billing cycle, applicable trial terms, first billing date and available payment methods before confirmation.",
  },
];

function dreamscapeSubscriptionHref(
  planKey: "core" | "nova",
  billingCycle: PricingView,
) {
  return `/dreamscape/subscribe?plan=${planKey}&cycle=${billingCycle}`;
}

function money(value: number) {
  return value.toFixed(value % 1 === 0 ? 0 : 2);
}

export default function PricingPage() {
  const [pricingView, setPricingView] =
    useState<PricingView>("annual");

  const [showSubscriptionComingSoon, setShowSubscriptionComingSoon] =
    useState(false);

  const [checkoutRole, setCheckoutRole] =
    useState<string | null>(null);

  const [isSignedIn, setIsSignedIn] =
    useState(false);

  const [checkoutAccessLoading, setCheckoutAccessLoading] =
    useState(true);

  const [viewportWidth, setViewportWidth] =
    useState(1440);

  const [publicPreviewActive, setPublicPreviewActive] =
    useState(() => isPublicPreviewActive());

  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const update = () =>
      setPublicPreviewActive(isPublicPreviewActive());

    update();
    const interval = window.setInterval(update, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadCheckoutAccess() {
      setCheckoutAccessLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (userError || !user) {
        setIsSignedIn(false);
        setCheckoutRole(null);
        setCheckoutAccessLoading(false);
        return;
      }

      setIsSignedIn(true);

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

      if (!isMounted) return;

      if (profileError) {
        console.warn(
          "Could not load pricing checkout role:",
          profileError.message,
        );
        setCheckoutRole(null);
      } else {
        setCheckoutRole(
          normaliseRole(profile?.role),
        );
      }

      setCheckoutAccessLoading(false);
    }

    void loadCheckoutAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

        if (
          event === "SIGNED_OUT" ||
          !session?.user
        ) {
          setIsSignedIn(false);
          setCheckoutRole(null);
          setCheckoutAccessLoading(false);
          return;
        }

        setIsSignedIn(true);

        window.setTimeout(() => {
          if (isMounted) {
            void loadCheckoutAccess();
          }
        }, 0);
      },
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const canOpenSubscriptionCheckout =
    !publicPreviewActive ||
    (
      checkoutRole !== null &&
      STAFF_CHECKOUT_ROLES.has(checkoutRole)
    );

  function handleSubscriptionClick(
    checkoutHref: string,
  ) {
    if (checkoutAccessLoading) return;

    if (canOpenSubscriptionCheckout) {
      window.location.assign(checkoutHref);
      return;
    }

    setShowSubscriptionComingSoon(true);
  }

  const isMobile = viewportWidth <= 700;
  const isCompact = viewportWidth <= 1180;

  const launchSavings = useMemo(
    () => ({
      core:
        pricingView === "monthly"
          ? 24.9 - 19.9
          : 249 - 199,
      nova:
        pricingView === "monthly"
          ? 29.9 - 24.9
          : 299 - 249,
    }),
    [pricingView],
  );

  const pageStyle: CSSProperties = {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 15% 12%, rgba(83,215,255,0.14), transparent 28%), radial-gradient(circle at 85% 30%, rgba(197,140,255,0.13), transparent 30%), #020813",
    color: "white",
    fontFamily: "Arial, Helvetica, sans-serif",
  };

  const smallLinkStyle: CSSProperties = {
    color: "rgba(255,255,255,0.72)",
    textDecoration: "none",
    fontSize: "14px",
  };

  return (
    <main style={pageStyle}>
      <header
        style={{
          minHeight: isMobile ? "72px" : "86px",
          padding: isMobile ? "0 18px" : "0 6vw",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "20px",
          borderBottom:
            "1px solid rgba(255,255,255,0.12)",
          background: "rgba(2,8,19,0.9)",
          backdropFilter: "blur(18px)",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "13px",
            color: "white",
            textDecoration: "none",
          }}
        >
          <img
            src="/home/dreamscape-logo.png"
            alt="Dreamscape One"
            style={{
              width: isMobile ? "40px" : "50px",
              height: isMobile ? "40px" : "50px",
              objectFit: "contain",
              borderRadius: "999px",
            }}
          />

          <div>
            <p
              style={{
                margin: 0,
                fontSize: isMobile ? "12px" : "16px",
                letterSpacing:
                  isMobile ? "0.16em" : "0.3em",
              }}
            >
              DREAMSCAPE ONE
            </p>

            <p
              style={{
                margin: "6px 0 0",
                color: "rgba(255,255,255,0.5)",
                fontSize: "9px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              Student Access
            </p>
          </div>
        </Link>

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? "10px" : "22px",
          }}
        >
          {!isMobile && (
            <>
              <Link href="/" style={smallLinkStyle}>
                Home
              </Link>

              <Link
                href="/education-licence"
                style={smallLinkStyle}
              >
                Education Licence
              </Link>
            </>
          )}

          <Link
            href={
              isSignedIn
                ? "/profile"
                : "/login?next=%2Fpricing"
            }
            style={{
              padding:
                isMobile
                  ? "10px 13px"
                  : "11px 18px",
              borderRadius: "999px",
              background:
                "rgba(255,255,255,0.94)",
              color: "#24124d",
              textDecoration: "none",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.08em",
              whiteSpace: "nowrap",
            }}
          >
            {checkoutAccessLoading
              ? "..."
              : isSignedIn
                ? "MY ACCOUNT"
                : "LOG IN"}
          </Link>
        </nav>
      </header>

      <section
        style={{
          padding:
            isMobile
              ? "76px 20px 58px"
              : "104px 6vw 76px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#8ee8ff",
            fontSize: "13px",
            fontWeight: 900,
            letterSpacing: "0.26em",
            textTransform: "uppercase",
          }}
        >
          Dreamscape Student Access
        </p>

        <h1
          style={{
            margin: "22px auto 0",
            maxWidth: "1050px",
            fontFamily:
              'Georgia, "Times New Roman", serif',
            fontSize:
              isMobile ? "45px" : "76px",
            fontWeight: 400,
            lineHeight: 1.04,
          }}
        >
          Choose how far learning goes.
        </h1>

        <p
          style={{
            margin: "26px auto 0",
            maxWidth: "860px",
            color: "rgba(255,255,255,0.7)",
            fontSize:
              isMobile ? "17px" : "21px",
            fontWeight: 300,
            lineHeight: 1.7,
          }}
        >
          Start with English and Mathematics in Core Missions,
          add deeper learning intelligence with NOVA+, or look
          ahead to the complete three-subject Full Access plan.
        </p>

        <div
          style={{
            margin: "30px auto 0",
            maxWidth: "940px",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          {[
            "Core from SGD 19.90",
            "NOVA+ from SGD 24.90",
            "Annual launch savings",
            "Full Access coming soon",
          ].map((item) => (
            <span
              key={item}
              style={{
                padding: "10px 14px",
                borderRadius: "999px",
                border:
                  "1px solid rgba(142,232,255,0.22)",
                background:
                  "rgba(255,255,255,0.045)",
                color:
                  "rgba(255,255,255,0.82)",
                fontSize:
                  isMobile ? "11px" : "12px",
                fontWeight: 800,
                lineHeight: 1.25,
              }}
            >
              {item}
            </span>
          ))}
        </div>

        <div
          style={{
            margin: "32px auto 0",
            width:
              isMobile ? "100%" : "fit-content",
            maxWidth: "470px",
            padding: "6px",
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            borderRadius: "999px",
            border:
              "1px solid rgba(142,232,255,0.24)",
            background:
              "rgba(255,255,255,0.05)",
          }}
        >
          {(
            [
              ["monthly", "Monthly"],
              ["annual", "Annual"],
            ] as const
          ).map(([view, label]) => {
            const active =
              pricingView === view;

            return (
              <button
                key={view}
                type="button"
                onClick={() =>
                  setPricingView(view)
                }
                style={{
                  minHeight: "48px",
                  padding: "12px 22px",
                  border: "none",
                  borderRadius: "999px",
                  cursor: "pointer",
                  background: active
                    ? "linear-gradient(90deg, #8ee8ff, #c58cff)"
                    : "transparent",
                  color: active
                    ? "#100622"
                    : "rgba(255,255,255,0.7)",
                  fontSize:
                    isMobile
                      ? "11px"
                      : "13px",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <section
        style={{
          padding:
            isMobile
              ? "0 20px 82px"
              : "0 6vw 106px",
        }}
      >
        {publicPreviewActive && (
          <div
            style={{
              maxWidth: "1420px",
              margin: "0 auto 25px",
              padding:
                isMobile
                  ? "16px 18px"
                  : "17px 22px",
              borderRadius: "20px",
              border:
                "1px solid rgba(142,232,255,0.24)",
              background:
                "linear-gradient(90deg, rgba(83,215,255,0.09), rgba(197,140,255,0.07), rgba(255,174,92,0.08))",
              color:
                "rgba(255,255,255,0.8)",
              fontSize:
                isMobile
                  ? "13px"
                  : "14px",
              fontWeight: 700,
              lineHeight: 1.6,
              textAlign: "center",
            }}
          >
            <strong style={{ color: "#8ee8ff" }}>
              Public Preview:
            </strong>{" "}
            Pricing is visible now. Authorised staff can test
            Stripe checkout while public subscriptions remain
            controlled by the Dreamscape checkout switch.
          </div>
        )}

        <div
          style={{
            maxWidth: "1420px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns:
              isMobile
                ? "1fr"
                : "repeat(3, minmax(0, 1fr))",
            gap:
              isMobile
                ? "22px"
                : "26px",
            alignItems: "stretch",
          }}
        >
          {plans.map((plan) => {
            const price =
              pricingView === "monthly"
                ? plan.monthlyPrice
                : plan.annualPrice;

            const regularPrice =
              pricingView === "monthly"
                ? plan.regularMonthlyPrice
                : plan.regularAnnualPrice;

            const hasPrice =
              typeof price === "number";

            const hasRegularPrice =
              typeof regularPrice === "number";

            const checkoutHref =
              !plan.comingSoon &&
              (plan.key === "core" ||
                plan.key === "nova")
                ? dreamscapeSubscriptionHref(
                    plan.key,
                    pricingView,
                  )
                : null;

            const saving =
              plan.key === "core" ||
              plan.key === "nova"
                ? launchSavings[plan.key]
                : null;

            return (
              <article
                key={plan.key}
                style={{
                  position: "relative",
                  minHeight:
                    isMobile
                      ? "auto"
                      : "670px",
                  display: "flex",
                  flexDirection: "column",
                  padding:
                    isMobile
                      ? "30px 22px"
                      : isCompact
                        ? "34px 22px"
                        : "38px 31px",
                  borderRadius: "30px",
                  border: plan.featured
                    ? `1px solid ${plan.accent}`
                    : "1px solid rgba(142,232,255,0.22)",
                  background: plan.featured
                    ? "radial-gradient(circle at 50% 0%, rgba(83,215,255,0.16), transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.09), rgba(255,255,255,0.025))"
                    : plan.comingSoon
                      ? "radial-gradient(circle at 85% 0%, rgba(255,174,92,0.11), transparent 32%), linear-gradient(145deg, rgba(255,255,255,0.058), rgba(255,255,255,0.018))"
                      : "linear-gradient(145deg, rgba(255,255,255,0.065), rgba(255,255,255,0.02))",
                  boxShadow: plan.featured
                    ? "0 30px 90px rgba(0,0,0,0.42), 0 0 35px rgba(83,215,255,0.1)"
                    : "0 25px 70px rgba(0,0,0,0.3)",
                }}
              >
                {plan.badge && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-14px",
                      right: "18px",
                      zIndex: 2,
                      padding: "8px 11px",
                      borderRadius: "999px",
                      background:
                        plan.comingSoon
                          ? "#ffae5c"
                          : plan.accent,
                      color: "#1b0c26",
                      fontSize: "10px",
                      fontWeight: 900,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                      boxShadow:
                        "0 8px 22px rgba(0,0,0,0.26)",
                    }}
                  >
                    {plan.badge}
                  </span>
                )}

                <p
                  style={{
                    margin: 0,
                    color: plan.accent,
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    paddingRight: "80px",
                  }}
                >
                  {plan.eyebrow}
                </p>

                <h2
                  style={{
                    margin: "16px 0 0",
                    fontSize: "32px",
                    fontWeight: 800,
                    lineHeight: 1.16,
                  }}
                >
                  {plan.name}
                </h2>

                {plan.comingSoon ? (
                  <div
                    style={{
                      marginTop: "30px",
                      minHeight: "92px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "flex-start",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: "#ffbd73",
                        fontSize:
                          isMobile
                            ? "30px"
                            : "36px",
                        fontWeight: 900,
                        lineHeight: 1.1,
                      }}
                    >
                      Coming Soon
                    </p>

                    <p
                      style={{
                        margin: "9px 0 0",
                        color:
                          "rgba(255,255,255,0.52)",
                        fontSize: "14px",
                        lineHeight: 1.5,
                      }}
                    >
                      Pricing will be announced closer to release.
                    </p>
                  </div>
                ) : (
                  <>
                    {hasRegularPrice && (
                      <div
                        style={{
                          marginTop: "25px",
                          display: "flex",
                          alignItems: "baseline",
                          gap: "9px",
                          color:
                            "rgba(255,255,255,0.45)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 900,
                            textTransform: "uppercase",
                            letterSpacing: "0.09em",
                          }}
                        >
                          Regular
                        </span>

                        <span
                          style={{
                            fontSize:
                              isMobile
                                ? "24px"
                                : "27px",
                            fontWeight: 800,
                            textDecoration:
                              "line-through",
                            textDecorationThickness:
                              "2px",
                          }}
                        >
                          SGD {money(regularPrice)}
                        </span>
                      </div>
                    )}

                    {hasPrice && (
                      <div
                        style={{
                          marginTop:
                            hasRegularPrice
                              ? "9px"
                              : "25px",
                          display: "flex",
                          alignItems: "flex-end",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            color:
                              "rgba(255,255,255,0.6)",
                            fontSize: "18px",
                            paddingBottom: "8px",
                          }}
                        >
                          SGD
                        </span>

                        <span
                          style={{
                            fontSize:
                              isMobile
                                ? "52px"
                                : "60px",
                            fontWeight: 900,
                            lineHeight: 1,
                          }}
                        >
                          {money(price)}
                        </span>
                      </div>
                    )}

                    <p
                      style={{
                        margin: "9px 0 0",
                        color:
                          "rgba(255,255,255,0.56)",
                        fontSize: "14px",
                      }}
                    >
                      {pricingView === "monthly"
                        ? "per month"
                        : "per year, paid upfront"}
                    </p>

                    {saving !== null && (
                      <p
                        style={{
                          margin: "11px 0 0",
                          color: plan.accent,
                          fontSize: "13px",
                          fontWeight: 800,
                        }}
                      >
                        Launch saving: SGD {money(saving)}
                      </p>
                    )}
                  </>
                )}

                {plan.trialEligible &&
                  !plan.comingSoon && (
                    <div
                      style={{
                        marginTop: "20px",
                        padding: "15px 16px",
                        borderRadius: "17px",
                        border:
                          "1px solid rgba(197,140,255,0.25)",
                        background:
                          "linear-gradient(90deg, rgba(197,140,255,0.12), rgba(83,215,255,0.08))",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          color: "#dcbcff",
                          fontSize: "11px",
                          fontWeight: 900,
                          letterSpacing: "0.13em",
                          textTransform: "uppercase",
                        }}
                      >
                        First {STANDARD_TRIAL_DAYS} days free
                      </p>

                      <p
                        style={{
                          margin: "7px 0 0",
                          color:
                            "rgba(255,255,255,0.66)",
                          fontSize: "12px",
                          fontWeight: 700,
                          lineHeight: 1.5,
                        }}
                      >
                        For eligible first-time Core Missions users.
                      </p>
                    </div>
                  )}

                <p
                  style={{
                    margin: "24px 0 0",
                    color:
                      "rgba(255,255,255,0.7)",
                    fontSize: "16px",
                    fontWeight: 300,
                    lineHeight: 1.65,
                  }}
                >
                  {plan.description}
                </p>

                <div
                  style={{
                    marginTop: "26px",
                    paddingTop: "24px",
                    borderTop:
                      "1px solid rgba(255,255,255,0.1)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                    flex: 1,
                  }}
                >
                  {plan.features.map(
                    (feature) => (
                      <div
                        key={feature}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "11px",
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            color:
                              plan.accent,
                            fontWeight: 900,
                          }}
                        >
                          ✓
                        </span>

                        <span
                          style={{
                            color:
                              "rgba(255,255,255,0.74)",
                            fontSize: "15px",
                            lineHeight: 1.5,
                          }}
                        >
                          {feature}
                        </span>
                      </div>
                    ),
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!checkoutHref) return;
                    handleSubscriptionClick(
                      checkoutHref,
                    );
                  }}
                  disabled={
                    checkoutAccessLoading ||
                    plan.comingSoon
                  }
                  style={{
                    marginTop:
                      isMobile
                        ? "24px"
                        : "30px",
                    width: "100%",
                    minHeight: "58px",
                    padding:
                      "13px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "space-between",
                    gap: "14px",
                    borderRadius: "999px",
                    border:
                      plan.comingSoon
                        ? "1px solid rgba(255,174,92,0.24)"
                        : "none",
                    background:
                      plan.comingSoon
                        ? "rgba(255,174,92,0.07)"
                        : plan.featured
                          ? "linear-gradient(90deg, #8ee8ff, #c58cff 58%, #ffae5c)"
                          : "rgba(255,255,255,0.94)",
                    color:
                      plan.comingSoon
                        ? "#ffbd73"
                        : "#18082e",
                    fontFamily: "inherit",
                    fontSize:
                      isCompact
                        ? "11px"
                        : "12px",
                    fontWeight: 900,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    cursor:
                      plan.comingSoon
                        ? "not-allowed"
                        : checkoutAccessLoading
                          ? "wait"
                          : "pointer",
                    opacity:
                      checkoutAccessLoading &&
                      !plan.comingSoon
                        ? 0.72
                        : 1,
                  }}
                >
                  <span>
                    {plan.comingSoon
                      ? "Full Access Coming Soon"
                      : checkoutAccessLoading
                        ? "Checking access..."
                        : plan.key === "core" &&
                            plan.trialEligible
                          ? `Start ${STANDARD_TRIAL_DAYS}-Day Free Trial`
                          : `Choose ${plan.name}`}
                  </span>

                  <span
                    aria-hidden="true"
                    style={{
                      width: "34px",
                      height: "34px",
                      flex: "0 0 auto",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "999px",
                      border:
                        "1px solid rgba(24,8,46,0.16)",
                      background:
                        plan.comingSoon
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(255,255,255,0.28)",
                    }}
                  >
                    {plan.comingSoon ? "…" : "→"}
                  </span>
                </button>

                {!plan.comingSoon && (
                  <p
                    style={{
                      margin: "11px 0 0",
                      color:
                        "rgba(255,255,255,0.42)",
                      fontSize: "11px",
                      fontWeight: 700,
                      lineHeight: 1.5,
                      textAlign: "center",
                    }}
                  >
                    {plan.trialEligible
                      ? `${STANDARD_TRIAL_DAYS}-day introductory trial · Secure Stripe checkout`
                      : "Secure recurring checkout powered by Stripe"}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section
        style={{
          padding:
            isMobile
              ? "78px 20px"
              : "100px 6vw",
          background:
            "linear-gradient(180deg, rgba(8,22,40,0.8), rgba(2,8,19,0.98))",
          borderTop:
            "1px solid rgba(142,232,255,0.13)",
        }}
      >
        <div
          style={{
            maxWidth: "1240px",
            margin: "0 auto",
          }}
        >
          <p
            style={{
              margin: 0,
              textAlign: "center",
              color: "#8ee8ff",
              fontSize: "12px",
              fontWeight: 900,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            Compare Plans
          </p>

          <h2
            style={{
              margin: "18px auto 0",
              textAlign: "center",
              fontFamily:
                'Georgia, "Times New Roman", serif',
              fontSize:
                isMobile ? "38px" : "54px",
              fontWeight: 400,
            }}
          >
            Find the access that fits.
          </h2>

          <div
            style={{
              marginTop: "40px",
              overflowX: "auto",
              borderRadius: "24px",
              border:
                "1px solid rgba(142,232,255,0.18)",
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: "720px",
                borderCollapse: "collapse",
                background:
                  "rgba(255,255,255,0.03)",
              }}
            >
              <thead>
                <tr>
                  {[
                    "Feature",
                    "Core Missions",
                    "NOVA+",
                    "Full Access",
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding:
                          "21px 18px",
                        textAlign:
                          heading === "Feature"
                            ? "left"
                            : "center",
                        color: "white",
                        fontSize: "14px",
                        borderBottom:
                          "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {comparisonRows.map(
                  (row) => (
                    <tr key={row.feature}>
                      <td
                        style={{
                          padding: "18px",
                          color:
                            "rgba(255,255,255,0.72)",
                          borderBottom:
                            "1px solid rgba(255,255,255,0.07)",
                        }}
                      >
                        {row.feature}
                      </td>

                      {(
                        [
                          "core",
                          "nova",
                          "full",
                        ] as const
                      ).map((key) => (
                        <td
                          key={key}
                          style={{
                            padding: "18px",
                            textAlign:
                              "center",
                            color:
                              row[key]
                                ? "#8ee8ff"
                                : "rgba(255,255,255,0.28)",
                            fontWeight: 900,
                            borderBottom:
                              "1px solid rgba(255,255,255,0.07)",
                          }}
                        >
                          {row[key]
                            ? "✓"
                            : "—"}
                        </td>
                      ))}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section
        style={{
          padding:
            isMobile
              ? "80px 20px"
              : "105px 6vw",
        }}
      >
        <div
          style={{
            maxWidth: "1050px",
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#8ee8ff",
              fontSize: "12px",
              fontWeight: 900,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            Questions
          </p>

          <h2
            style={{
              margin: "18px 0 0",
              fontFamily:
                'Georgia, "Times New Roman", serif',
              fontSize:
                isMobile ? "39px" : "54px",
              fontWeight: 400,
            }}
          >
            Before you subscribe.
          </h2>

          <div
            style={{
              marginTop: "38px",
              display: "flex",
              flexDirection: "column",
              gap: "13px",
              textAlign: "left",
            }}
          >
            {faqItems.map((item) => (
              <details
                key={item.question}
                style={{
                  borderRadius: "18px",
                  border:
                    "1px solid rgba(142,232,255,0.18)",
                  background:
                    "rgba(255,255,255,0.035)",
                  overflow: "hidden",
                }}
              >
                <summary
                  style={{
                    padding:
                      "21px 23px",
                    cursor: "pointer",
                    color: "white",
                    fontSize: "17px",
                    fontWeight: 800,
                  }}
                >
                  {item.question}
                </summary>

                <p
                  style={{
                    margin: 0,
                    padding:
                      "0 23px 23px",
                    color:
                      "rgba(255,255,255,0.68)",
                    fontSize: "15px",
                    lineHeight: 1.7,
                  }}
                >
                  {item.answer}
                </p>
              </details>
            ))}
          </div>

          <p
            style={{
              margin: "34px auto 0",
              maxWidth: "780px",
              color:
                "rgba(255,255,255,0.52)",
              fontSize: "13px",
              lineHeight: 1.7,
            }}
          >
            All prices are in Singapore dollars. Dreamscape
            subscription payments are processed securely by
            Stripe. Core Missions introductory trial eligibility
            and all subscriptions remain subject to the applicable
            Terms & Conditions.
          </p>

          <div
            style={{
              marginTop: "24px",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "16px",
            }}
          >
            <Link
              href="/terms"
              style={smallLinkStyle}
            >
              Terms & Conditions
            </Link>

            <Link
              href="/privacy"
              style={smallLinkStyle}
            >
              Privacy Policy
            </Link>

            <a
              href="mailto:admin@gurukidspro.com"
              style={smallLinkStyle}
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>

      {showSubscriptionComingSoon && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="subscription-coming-soon-title"
          onClick={() =>
            setShowSubscriptionComingSoon(false)
          }
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 110,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding:
              isMobile
                ? "16px"
                : "28px",
            background:
              "rgba(1,4,11,0.8)",
            backdropFilter: "blur(14px)",
          }}
        >
          <div
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              position: "relative",
              width: "min(610px, 100%)",
              padding:
                isMobile
                  ? "34px 23px 27px"
                  : "45px 42px 36px",
              borderRadius:
                isMobile
                  ? "25px"
                  : "31px",
              border:
                "1px solid rgba(142,232,255,0.3)",
              background:
                "radial-gradient(circle at 10% 0%, rgba(83,215,255,0.16), transparent 34%), radial-gradient(circle at 100% 100%, rgba(255,174,92,0.13), transparent 35%), #071326",
              boxShadow:
                "0 34px 100px rgba(0,0,0,0.6), 0 0 40px rgba(142,232,255,0.09)",
              color: "white",
              textAlign: "center",
            }}
          >
            <button
              type="button"
              aria-label="Close subscriptions coming soon message"
              onClick={() =>
                setShowSubscriptionComingSoon(false)
              }
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                width: "38px",
                height: "38px",
                borderRadius: "999px",
                border:
                  "1px solid rgba(255,255,255,0.2)",
                background:
                  "rgba(255,255,255,0.06)",
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
                color: "#8ee8ff",
                fontSize: "11px",
                fontWeight: 900,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              Dreamscape One Public Preview
            </p>

            <h2
              id="subscription-coming-soon-title"
              style={{
                margin: "17px 0 0",
                fontFamily:
                  'Georgia, "Times New Roman", serif',
                fontSize:
                  isMobile
                    ? "37px"
                    : "48px",
                fontWeight: 400,
                lineHeight: 1.08,
              }}
            >
              Subscriptions are still in preview
            </h2>

            <p
              style={{
                margin:
                  "22px auto 0",
                maxWidth: "500px",
                color:
                  "rgba(255,255,255,0.72)",
                fontSize:
                  isMobile
                    ? "15px"
                    : "17px",
                lineHeight: 1.7,
              }}
            >
              Pricing is visible now, while public checkout remains
              controlled during preview. Authorised staff accounts
              can continue testing the Stripe subscription flow.
            </p>

            <button
              type="button"
              onClick={() =>
                setShowSubscriptionComingSoon(false)
              }
              style={{
                marginTop: "28px",
                minHeight: "54px",
                padding: "14px 25px",
                borderRadius: "999px",
                border:
                  "1px solid rgba(255,255,255,0.2)",
                background:
                  "rgba(255,255,255,0.05)",
                color: "white",
                fontFamily: "inherit",
                fontSize: "12px",
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Not Now
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
