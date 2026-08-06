"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import { isPublicPreviewActive } from "@/lib/public-preview";

type PricingView = "monthly" | "annual" | "gkp";

const STAFF_CHECKOUT_ROLES = new Set([
  "admin",
  "teacher",
  "curriculum_lead",
]);

function normaliseRole(role: string | null | undefined) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

type Plan = {
  key: "science" | "core" | "complete";
  name: string;
  eyebrow: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
  accent: string;
  featured?: boolean;
};

type GkpPlan = {
  key: "gkp-core" | "gkp-full";
  name: string;
  price: number;
  eyebrow: string;
  description: string;
  features: string[];
  accent: string;
  featured: boolean;
};

const plans: Plan[] = [
  {
    key: "science",
    name: "Science Missions",
    eyebrow: "Focused Access",
    monthlyPrice: 9.9,
    annualPrice: 99,
    description:
      "Curriculum-based Science missions for learners who want focused topic practice and regular revision.",
    features: [
      "Primary 1–6 Science missions",
      "Topic quizzes and mixed assessments",
      "Scores, progress, and completion records",
      "Dream Token and Dream Gem rewards",
      "New content and platform updates",
    ],
    accent: "#53d7ff",
  },
  {
    key: "core",
    name: "Core Missions",
    eyebrow: "English + Mathematics",
    monthlyPrice: 19.9,
    annualPrice: 199,
    description:
      "Structured English and Mathematics practice across key primary-school topics and assessment formats.",
    features: [
      "Primary 1–6 English missions",
      "Primary 1–6 Mathematics missions",
      "Topic quizzes and mixed assessments",
      "Scores, progress, and completion records",
      "Dream Token and Dream Gem rewards",
    ],
    accent: "#c58cff",
  },
  {
    key: "complete",
    name: "Complete Missions",
    eyebrow: "Best Overall Value + Milo",
    monthlyPrice: 24.9,
    annualPrice: 249,
    description:
      "Full access to English, Mathematics, and Science Learning Missions, with Milo’s Business Builder included when it launches.",
    features: [
      "Everything in Core Missions",
      "Everything in Science Missions",
      "English, Mathematics, and Science access",
      "Full curriculum-mission progression",
      "Milo’s Business Builder included when launched",
      "One complete Dreamscape learning plan",
    ],
    accent: "#ffae5c",
    featured: true,
  },
];

const comparisonRows = [
  {
    feature: "Primary English missions",
    science: false,
    core: true,
    complete: true,
  },
  {
    feature: "Primary Mathematics missions",
    science: false,
    core: true,
    complete: true,
  },
  {
    feature: "Primary Science missions",
    science: true,
    core: false,
    complete: true,
  },
  {
    feature: "Topic quizzes and assessments",
    science: true,
    core: true,
    complete: true,
  },
  {
    feature: "Progress and reward records",
    science: true,
    core: true,
    complete: true,
  },
  {
    feature: "Content and platform updates",
    science: true,
    core: true,
    complete: true,
  },
  {
    feature: "Milo’s Business Builder when launched",
    science: false,
    core: false,
    complete: true,
  },
];

const faqItems = [
  {
    question: "Who should purchase a student plan?",
    answer:
      "A parent or guardian should purchase or authorise paid access for users below 18. The learner may still use their own supervised account.",
  },
  {
    question: "Can I change plans later?",
    answer:
      "Plan changes may be offered through the account or checkout process. Any price difference, remaining term, or upgrade conditions will be shown before confirmation.",
  },
  {
    question: "What does the annual option mean?",
    answer:
      "Annual access is paid upfront for a 12-month subscription. The annual prices shown are lower than paying the equivalent monthly plan for 12 months.",
  },
  {
    question: "Is Milo’s Business Builder included?",
    answer:
      "Milo’s Business Builder is coming soon. When launched, it will be available for SGD 9.90 per month as a standalone subscription and included at no additional charge with an active Complete Missions subscription.",
  },
  {
    question: "How does the Guru Kids Pro student offer work?",
    answer:
      "New students who sign up for an eligible Guru Kids Pro Primary English or Mathematics class and complete one full month of classes receive one month of Full Dreamscape Student Access. After the free month, continued access is available at SGD 9.90 per month for Core Access or SGD 14.90 per month for Full Access. The selected Dreamscape charge is added to the student’s normal Guru Kids Pro class billing.",
  },
  {
    question: "How are payments processed?",
    answer:
      "During the Public Preview, public subscriptions are not open. Once public checkout is available, payment methods will be displayed during checkout. GKP student add-ons continue to be handled through normal Guru Kids Pro class billing.",
  },
];

const gkpPlans: GkpPlan[] = [
  {
    key: "gkp-core",
    name: "GKP Core Access",
    price: 9.9,
    eyebrow: "For active GKP students",
    description:
      "English and Mathematics Learning Missions at a special monthly add-on rate for eligible Guru Kids Pro students.",
    features: [
      "Primary 1–6 English Learning Missions",
      "Primary 1–6 Mathematics Learning Missions",
      "Topic quizzes and mixed assessments",
      "Progress, Dream Token, and Dream Gem rewards",
      "Added to normal Guru Kids Pro class billing",
    ],
    accent: "#8ee8ff",
    featured: false,
  },
  {
    key: "gkp-full",
    name: "GKP Full Access",
    price: 14.9,
    eyebrow: "Best GKP value",
    description:
      "Complete English, Mathematics, and Science access for eligible Guru Kids Pro students.",
    features: [
      "Everything in GKP Core Access",
      "Primary 1–6 Science Learning Missions",
      "Complete Learning Missions progression",
      "Milo’s Business Builder included when launched",
      "Added to normal Guru Kids Pro class billing",
    ],
    accent: "#ffae5c",
    featured: true,
  },
];

const gkpEmailHref =
  "mailto:admin@gurukidspro.com?subject=Guru%20Kids%20Pro%20Dreamscape%20Student%20Access&body=Parent%20name%3A%0AStudent%20name%3A%0ACurrent%20or%20new%20GKP%20class%3A%0APreferred%20Dreamscape%20plan%3A";

const gkpWhatsAppHref =
  "https://wa.me/6583888949?text=Hello%20Guru%20Kids%20Pro%2C%20I%20would%20like%20to%20enquire%20about%20Dreamscape%20Student%20Access%20for%20GKP%20students.";

const checkoutLinks = {
  science: {
    monthly:
      process.env.NEXT_PUBLIC_SHOPIFY_SCIENCE_MONTHLY_URL ??
      "/cart?plan=science-monthly",
    annual:
      process.env.NEXT_PUBLIC_SHOPIFY_SCIENCE_ANNUAL_URL ??
      "/cart?plan=science-annual",
  },
  core: {
    monthly:
      process.env.NEXT_PUBLIC_SHOPIFY_CORE_MONTHLY_URL ??
      "/cart?plan=core-monthly",
    annual:
      process.env.NEXT_PUBLIC_SHOPIFY_CORE_ANNUAL_URL ??
      "/cart?plan=core-annual",
  },
  complete: {
    monthly:
      process.env.NEXT_PUBLIC_SHOPIFY_COMPLETE_MONTHLY_URL ??
      "/cart?plan=complete-monthly",
    annual:
      process.env.NEXT_PUBLIC_SHOPIFY_COMPLETE_ANNUAL_URL ??
      "/cart?plan=complete-annual",
  },
} as const;

function money(value: number) {
  return value.toFixed(value % 1 === 0 ? 0 : 2);
}

export default function PricingPage() {
  const [pricingView, setPricingView] =
    useState<PricingView>("annual");
  const [showGkpTerms, setShowGkpTerms] = useState(false);
  const [showSubscriptionComingSoon, setShowSubscriptionComingSoon] =
    useState(false);
  const [checkoutRole, setCheckoutRole] = useState<string | null>(null);
  const [checkoutAccessLoading, setCheckoutAccessLoading] = useState(true);
  const [viewportWidth, setViewportWidth] = useState(1440);
  const [publicPreviewActive, setPublicPreviewActive] = useState(() =>
    isPublicPreviewActive(),
  );

  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const update = () => setPublicPreviewActive(isPublicPreviewActive());
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
        setCheckoutRole(null);
        setCheckoutAccessLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
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
        setCheckoutRole(normaliseRole(profile?.role));
      }

      setCheckoutAccessLoading(false);
    }

    void loadCheckoutAccess();

    return () => {
      isMounted = false;
    };
  }, []);

  const canOpenShopifyCheckout =
    !publicPreviewActive ||
    (checkoutRole !== null && STAFF_CHECKOUT_ROLES.has(checkoutRole));

  function handleSubscriptionClick(checkoutHref: string) {
    if (checkoutAccessLoading) return;

    if (canOpenShopifyCheckout) {
      window.location.assign(checkoutHref);
      return;
    }

    setShowSubscriptionComingSoon(true);
  }

  const isMobile = viewportWidth <= 700;
  const isCompact = viewportWidth <= 1180;
  const regularBillingCycle = pricingView === "monthly" ? "monthly" : "annual";

  const annualSavings = useMemo(
    () =>
      Object.fromEntries(
        plans.map((plan) => [
          plan.key,
          plan.monthlyPrice * 12 - plan.annualPrice,
        ]),
      ) as Record<Plan["key"], number>,
    [],
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
          borderBottom: "1px solid rgba(255,255,255,0.12)",
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
                letterSpacing: isMobile ? "0.16em" : "0.3em",
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
              <Link href="/education-licence" style={smallLinkStyle}>
                Education Licence
              </Link>
            </>
          )}
          <Link
            href="/login"
            style={{
              padding: isMobile ? "10px 13px" : "11px 18px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.94)",
              color: "#24124d",
              textDecoration: "none",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.08em",
            }}
          >
            LOG IN
          </Link>
        </nav>
      </header>

      <section
        style={{
          padding: isMobile ? "76px 20px 56px" : "104px 6vw 72px",
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
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: isMobile ? "45px" : "76px",
            fontWeight: 400,
            lineHeight: 1.04,
          }}
        >
          Choose the right Learning Missions plan.
        </h1>

        <p
          style={{
            margin: "26px auto 0",
            maxWidth: "820px",
            color: "rgba(255,255,255,0.7)",
            fontSize: isMobile ? "17px" : "21px",
            fontWeight: 300,
            lineHeight: 1.7,
          }}
        >
          Build consistent practice across English, Mathematics, and Science
          with structured missions, meaningful progress, and rewards. Complete
          Missions will also include Milo’s Business Builder when it launches.
        </p>

        <div
          style={{
            margin: "36px auto 0",
            width: isMobile ? "100%" : "fit-content",
            maxWidth: "680px",
            padding: "6px",
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            borderRadius: isMobile ? "22px" : "999px",
            border: "1px solid rgba(142,232,255,0.24)",
            background: "rgba(255,255,255,0.05)",
          }}
        >
          {(
            [
              ["monthly", "Monthly"],
              ["annual", "Annual"],
              ["gkp", "GKP Students"],
            ] as const
          ).map(([view, label]) => {
            const active = pricingView === view;

            return (
              <button
                key={view}
                type="button"
                onClick={() => setPricingView(view)}
                style={{
                  minWidth: 0,
                  minHeight: isMobile ? "52px" : "48px",
                  padding: isMobile ? "10px 8px" : "12px 18px",
                  border: "none",
                  borderRadius: "999px",
                  cursor: "pointer",
                  background: active
                    ? view === "gkp"
                      ? "linear-gradient(90deg, #8ee8ff, #ffae5c)"
                      : "linear-gradient(90deg, #8ee8ff, #c58cff)"
                    : "transparent",
                  color: active ? "#100622" : "rgba(255,255,255,0.7)",
                  fontSize: isMobile ? "10px" : "13px",
                  fontWeight: 900,
                  lineHeight: 1.2,
                  letterSpacing: isMobile ? "0.035em" : "0.08em",
                  textTransform: "uppercase",
                  textAlign: "center",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {pricingView !== "gkp" && (
      <section
        style={{
          padding: isMobile ? "0 20px 80px" : "0 6vw 100px",
        }}
      >
        {publicPreviewActive && (
          <div
            style={{
              maxWidth: "1420px",
              margin: "0 auto 24px",
              padding: isMobile ? "16px 18px" : "17px 22px",
              borderRadius: "20px",
              border: "1px solid rgba(142,232,255,0.24)",
              background:
                "linear-gradient(90deg, rgba(83,215,255,0.09), rgba(197,140,255,0.07), rgba(255,174,92,0.08))",
              color: "rgba(255,255,255,0.8)",
              fontSize: isMobile ? "13px" : "14px",
              fontWeight: 700,
              lineHeight: 1.6,
              textAlign: "center",
            }}
          >
            <strong style={{ color: "#8ee8ff" }}>Public Preview:</strong>{" "}
            Free activity zones are available now. Student Access subscriptions
            open on 1 October.
          </div>
        )}

        <div
          style={{
            maxWidth: "1420px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(3, minmax(0, 1fr))",
            gap: isMobile ? "22px" : "26px",
            alignItems: "stretch",
          }}
        >
          {plans.map((plan) => {
            const price =
              regularBillingCycle === "monthly"
                ? plan.monthlyPrice
                : plan.annualPrice;
            const checkoutHref =
              checkoutLinks[plan.key][regularBillingCycle];

            return (
              <article
                key={plan.key}
                style={{
                  position: "relative",
                  minHeight: "650px",
                  display: "flex",
                  flexDirection: "column",
                  padding: isMobile
                    ? "30px 22px"
                    : isCompact
                      ? "34px 22px"
                      : "38px 31px",
                  borderRadius: "30px",
                  border: plan.featured
                    ? `1px solid ${plan.accent}`
                    : "1px solid rgba(142,232,255,0.22)",
                  background: plan.featured
                    ? "radial-gradient(circle at 50% 0%, rgba(255,174,92,0.14), transparent 32%), linear-gradient(145deg, rgba(255,255,255,0.09), rgba(255,255,255,0.025))"
                    : "linear-gradient(145deg, rgba(255,255,255,0.065), rgba(255,255,255,0.02))",
                  boxShadow: plan.featured
                    ? "0 30px 90px rgba(0,0,0,0.42), 0 0 35px rgba(255,174,92,0.11)"
                    : "0 25px 70px rgba(0,0,0,0.3)",
                }}
              >
                {plan.featured && (
                  <span
                    style={{
                      position: "absolute",
                      top: "18px",
                      right: "18px",
                      padding: "8px 11px",
                      borderRadius: "999px",
                      background: "#ffae5c",
                      color: "#1b0c26",
                      fontSize: "10px",
                      fontWeight: 900,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    Best Value
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

                <div
                  style={{
                    marginTop: "25px",
                    display: "flex",
                    alignItems: "flex-end",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      color: "rgba(255,255,255,0.6)",
                      fontSize: "18px",
                      paddingBottom: "8px",
                    }}
                  >
                    SGD
                  </span>
                  <span
                    style={{
                      fontSize: isMobile ? "52px" : "60px",
                      fontWeight: 900,
                      lineHeight: 1,
                    }}
                  >
                    {money(price)}
                  </span>
                </div>

                <p
                  style={{
                    margin: "9px 0 0",
                    color: "rgba(255,255,255,0.56)",
                    fontSize: "14px",
                  }}
                >
                  {regularBillingCycle === "monthly"
                    ? "per month"
                    : "per year, paid upfront"}
                </p>

                {regularBillingCycle === "annual" && (
                  <p
                    style={{
                      margin: "12px 0 0",
                      color: "#8ee8ff",
                      fontSize: "13px",
                      fontWeight: 800,
                    }}
                  >
                    Save SGD {money(annualSavings[plan.key])} compared with
                    12 monthly payments.
                  </p>
                )}

                <p
                  style={{
                    margin: "24px 0 0",
                    color: "rgba(255,255,255,0.7)",
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
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                    flex: 1,
                  }}
                >
                  {plan.features.map((feature) => (
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
                          color: plan.accent,
                          fontWeight: 900,
                        }}
                      >
                        ✓
                      </span>
                      <span
                        style={{
                          color: "rgba(255,255,255,0.74)",
                          fontSize: "15px",
                          lineHeight: 1.5,
                        }}
                      >
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleSubscriptionClick(checkoutHref)}
                  disabled={checkoutAccessLoading}
                  style={{
                    marginTop: isMobile ? "24px" : "30px",
                    width: "100%",
                    minWidth: 0,
                    border: "none",
                    fontFamily: "inherit",
                    cursor: checkoutAccessLoading ? "wait" : "pointer",
                    opacity: checkoutAccessLoading ? 0.72 : 1,
                    minHeight: isMobile
                      ? "56px"
                      : isCompact
                        ? "60px"
                        : "58px",
                    padding: isMobile
                      ? "11px 12px 11px 17px"
                      : isCompact
                        ? "12px 13px 12px 18px"
                        : "13px 14px 13px 21px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: isCompact ? "10px" : "14px",
                    borderRadius: "999px",
                    textDecoration: "none",
                    background: plan.featured
                      ? "linear-gradient(90deg, #8ee8ff, #c58cff 58%, #ffae5c)"
                      : "rgba(255,255,255,0.94)",
                    color: "#18082e",
                    fontSize: isMobile
                      ? "11px"
                      : isCompact
                        ? "clamp(10px, 1.05vw, 12px)"
                        : "13px",
                    fontWeight: 900,
                    lineHeight: 1.25,
                    letterSpacing: isCompact ? "0.045em" : "0.075em",
                    textTransform: "uppercase",
                    textAlign: "left",
                    boxSizing: "border-box",
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      minWidth: 0,
                      flex: "1 1 auto",
                      overflowWrap: "break-word",
                    }}
                  >
                    {checkoutAccessLoading
                      ? "Checking access..."
                      : `Choose ${plan.name}`}
                  </span>

                  <span
                    aria-hidden="true"
                    style={{
                      width: isMobile ? "32px" : "34px",
                      height: isMobile ? "32px" : "34px",
                      flex: "0 0 auto",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "999px",
                      border: "1px solid rgba(24,8,46,0.18)",
                      background: "rgba(255,255,255,0.28)",
                      fontSize: "15px",
                      lineHeight: 1,
                    }}
                  >
                    →
                  </span>
                </button>
              </article>
            );
          })}
        </div>

        <div
          style={{
            maxWidth: "1420px",
            margin: isMobile ? "28px auto 0" : "34px auto 0",
            position: "relative",
            overflow: "hidden",
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "minmax(0, 0.72fr) minmax(0, 1.28fr)",
            gap: isMobile ? "28px" : "50px",
            alignItems: "center",
            padding: isMobile ? "32px 25px" : "42px 46px",
            borderRadius: "30px",
            border: "1px solid rgba(255,174,92,0.34)",
            background:
              "radial-gradient(circle at 12% 20%, rgba(255,174,92,0.17), transparent 28%), radial-gradient(circle at 88% 80%, rgba(197,140,255,0.14), transparent 30%), linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.022))",
            boxShadow:
              "0 28px 80px rgba(0,0,0,0.34), inset 0 0 28px rgba(255,174,92,0.025)",
          }}
        >
          <div
            style={{
              minHeight: isMobile ? "220px" : "270px",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "25px",
              border: "1px solid rgba(255,174,92,0.2)",
              background:
                "radial-gradient(circle at 50% 38%, rgba(255,174,92,0.17), rgba(197,140,255,0.1) 48%, rgba(2,8,19,0.82))",
              overflow: "hidden",
            }}
          >
            <img
              src="/milo-world/milo-character.png"
              alt="Milo from Dreamscape One"
              style={{
                position: "absolute",
                left: "3%",
                bottom: 0,
                width: isMobile ? "52%" : "48%",
                maxHeight: "94%",
                objectFit: "contain",
                objectPosition: "bottom",
                filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.34))",
              }}
            />

            <div
              style={{
                position: "absolute",
                right: "8%",
                top: "12%",
                padding: "10px 13px",
                borderRadius: "999px",
                background: "#ffae5c",
                color: "#1a0b24",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Coming Soon
            </div>

            <div
              style={{
                position: "absolute",
                right: "8%",
                bottom: "12%",
                width: isMobile ? "46%" : "48%",
                padding: isMobile ? "15px" : "18px",
                borderRadius: "20px",
                border: "1px solid rgba(255,255,255,0.13)",
                background: "rgba(2,8,19,0.7)",
                backdropFilter: "blur(14px)",
                textAlign: "left",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#ffae5c",
                  fontSize: isMobile ? "24px" : "30px",
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              >
                SGD 9.90
              </p>
              <p
                style={{
                  margin: "7px 0 0",
                  color: "rgba(255,255,255,0.76)",
                  fontSize: "13px",
                  fontWeight: 700,
                  lineHeight: 1.45,
                }}
              >
                per month standalone
              </p>
            </div>
          </div>

          <div style={{ textAlign: "left" }}>
            <p
              style={{
                margin: 0,
                color: "#ffae5c",
                fontSize: "12px",
                fontWeight: 900,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              Milo’s World Add-On
            </p>

            <h2
              style={{
                margin: "15px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "38px" : "52px",
                fontWeight: 400,
                lineHeight: 1.08,
              }}
            >
              Milo’s Business Builder
            </h2>

            <p
              style={{
                margin: "21px 0 0",
                color: "rgba(255,255,255,0.7)",
                fontSize: isMobile ? "16px" : "18px",
                fontWeight: 300,
                lineHeight: 1.7,
              }}
            >
              Build and manage virtual businesses, make pricing and staffing
              decisions, explore market demand, and practise entrepreneurship
              through a safe simulation.
            </p>

            <div
              style={{
                marginTop: "25px",
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              {[
                "SGD 9.90/month standalone",
                "Included with Complete Missions",
                "No real financial risk",
              ].map((item) => (
                <span
                  key={item}
                  style={{
                    padding: "10px 13px",
                    borderRadius: "999px",
                    border: "1px solid rgba(255,174,92,0.22)",
                    background: "rgba(255,255,255,0.045)",
                    color: "rgba(255,255,255,0.82)",
                    fontSize: "12px",
                    fontWeight: 800,
                  }}
                >
                  {item}
                </span>
              ))}
            </div>

            <div
              aria-disabled="true"
              style={{
                marginTop: "28px",
                minHeight: "54px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "14px 24px",
                borderRadius: "999px",
                border: "1px solid rgba(255,174,92,0.32)",
                background: "rgba(255,174,92,0.08)",
                color: "#ffca8c",
                fontSize: "13px",
                fontWeight: 900,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                cursor: "not-allowed",
              }}
            >
              Coming Soon
            </div>

            <p
              style={{
                margin: "14px 0 0",
                color: "rgba(255,255,255,0.48)",
                fontSize: "12px",
                lineHeight: 1.6,
              }}
            >
              No separate Business Builder payment is required for active
              Complete Missions subscribers once the feature launches.
            </p>
          </div>
        </div>
      </section>

      )}

      {pricingView === "gkp" && (
        <section
          style={{
            padding: isMobile ? "0 20px 82px" : "0 6vw 105px",
          }}
        >
          <div
            style={{
              maxWidth: "1320px",
              margin: "0 auto",
              padding: isMobile ? "34px 24px" : "48px 46px",
              borderRadius: "32px",
              border: "1px solid rgba(255,174,92,0.32)",
              background:
                "radial-gradient(circle at 10% 12%, rgba(83,215,255,0.16), transparent 30%), radial-gradient(circle at 90% 90%, rgba(255,174,92,0.14), transparent 30%), linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))",
              boxShadow:
                "0 30px 90px rgba(0,0,0,0.38), inset 0 0 28px rgba(83,215,255,0.025)",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  margin: 0,
                  color: "#ffbd73",
                  fontSize: "12px",
                  fontWeight: 900,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                }}
              >
                Exclusive for Guru Kids Pro Students
              </p>

              <h2
                style={{
                  margin: "18px auto 0",
                  maxWidth: "900px",
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: isMobile ? "38px" : "clamp(48px, 5vw, 62px)",
                  fontWeight: 400,
                  lineHeight: 1.08,
                }}
              >
                Join a GKP Primary class and receive one month of Full Student Access.
              </h2>

              <p
                style={{
                  margin: "24px auto 0",
                  maxWidth: "880px",
                  color: "rgba(255,255,255,0.72)",
                  fontSize: isMobile ? "16px" : "19px",
                  fontWeight: 300,
                  lineHeight: 1.72,
                }}
              >
                New sign-ups to eligible Guru Kids Pro Primary English or
                Mathematics classes receive one month of Full Dreamscape
                Student Access after completing one full month of classes.
              </p>

              <div
                style={{
                  marginTop: "28px",
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: "10px",
                }}
              >
                {[
                  "New sign-ups only",
                  "Primary English or Mathematics only",
                  "Complete one full month at GKP",
                  "One free month of Full Access",
                ].map((item) => (
                  <span
                    key={item}
                    style={{
                      padding: "10px 13px",
                      borderRadius: "999px",
                      border: "1px solid rgba(255,174,92,0.24)",
                      background: "rgba(255,255,255,0.045)",
                      color: "rgba(255,255,255,0.82)",
                      fontSize: "12px",
                      fontWeight: 800,
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div
              style={{
                marginTop: isMobile ? "36px" : "48px",
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(2, minmax(0, 1fr))",
                gap: isMobile ? "20px" : "24px",
                alignItems: "stretch",
              }}
            >
              {gkpPlans.map((plan) => (
                <article
                  key={plan.key}
                  style={{
                    position: "relative",
                    minHeight: "540px",
                    display: "flex",
                    flexDirection: "column",
                    padding: isMobile ? "30px 23px" : "36px 30px",
                    borderRadius: "28px",
                    border: plan.featured
                      ? `1px solid ${plan.accent}`
                      : "1px solid rgba(142,232,255,0.23)",
                    background: plan.featured
                      ? "radial-gradient(circle at 50% 0%, rgba(255,174,92,0.13), transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.085), rgba(255,255,255,0.025))"
                      : "linear-gradient(145deg, rgba(255,255,255,0.065), rgba(255,255,255,0.02))",
                    boxShadow: plan.featured
                      ? "0 28px 80px rgba(0,0,0,0.36), 0 0 32px rgba(255,174,92,0.1)"
                      : "0 24px 65px rgba(0,0,0,0.28)",
                  }}
                >
                  {plan.featured && (
                    <span
                      style={{
                        position: "absolute",
                        top: "18px",
                        right: "18px",
                        padding: "8px 11px",
                        borderRadius: "999px",
                        background: "#ffae5c",
                        color: "#1b0c26",
                        fontSize: "10px",
                        fontWeight: 900,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      Full Access
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
                    }}
                  >
                    {plan.eyebrow}
                  </p>

                  <h3
                    style={{
                      margin: "15px 0 0",
                      color: "white",
                      fontSize: isMobile ? "29px" : "34px",
                      fontWeight: 800,
                      lineHeight: 1.15,
                    }}
                  >
                    {plan.name}
                  </h3>

                  <div
                    style={{
                      marginTop: "24px",
                      display: "flex",
                      alignItems: "flex-end",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        color: "rgba(255,255,255,0.6)",
                        fontSize: "17px",
                        paddingBottom: "7px",
                      }}
                    >
                      SGD
                    </span>
                    <span
                      style={{
                        fontSize: isMobile ? "50px" : "58px",
                        fontWeight: 900,
                        lineHeight: 1,
                      }}
                    >
                      {money(plan.price)}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: "8px 0 0",
                      color: "rgba(255,255,255,0.55)",
                      fontSize: "14px",
                    }}
                  >
                    per month · GKP students only
                  </p>

                  <p
                    style={{
                      margin: "23px 0 0",
                      color: "rgba(255,255,255,0.7)",
                      fontSize: "16px",
                      fontWeight: 300,
                      lineHeight: 1.65,
                    }}
                  >
                    {plan.description}
                  </p>

                  <div
                    style={{
                      marginTop: "25px",
                      paddingTop: "23px",
                      borderTop: "1px solid rgba(255,255,255,0.1)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "13px",
                      flex: 1,
                    }}
                  >
                    {plan.features.map((feature) => (
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
                          style={{ color: plan.accent, fontWeight: 900 }}
                        >
                          ✓
                        </span>
                        <span
                          style={{
                            color: "rgba(255,255,255,0.74)",
                            fontSize: "15px",
                            lineHeight: 1.5,
                          }}
                        >
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <div
              style={{
                marginTop: isMobile ? "28px" : "36px",
                padding: isMobile ? "25px 21px" : "30px 28px",
                borderRadius: "24px",
                border: "1px solid rgba(142,232,255,0.2)",
                background: "rgba(255,255,255,0.035)",
                textAlign: "center",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: "white",
                  fontSize: isMobile ? "24px" : "29px",
                  fontWeight: 800,
                }}
              >
                Dreamscape is added to normal GKP class billing.
              </h3>

              <p
                style={{
                  margin: "14px auto 0",
                  maxWidth: "820px",
                  color: "rgba(255,255,255,0.66)",
                  fontSize: "15px",
                  lineHeight: 1.68,
                }}
              >
                After the free Full Access month, parents may continue with
                GKP Core Access at SGD 9.90/month or GKP Full Access at SGD
                14.90/month. Unless the parent or guardian opts out before the
                free month ends, the selected Dreamscape add-on will be added
                to the student’s normal Guru Kids Pro class billing.
              </p>

              <div
                style={{
                  marginTop: "24px",
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: "12px",
                }}
              >
                <a
                  href={gkpEmailHref}
                  style={{
                    width: isMobile ? "100%" : "auto",
                    minHeight: "54px",
                    padding: "14px 22px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "999px",
                    background:
                      "linear-gradient(90deg, #8ee8ff, #c58cff 60%, #ffae5c)",
                    color: "#160729",
                    textDecoration: "none",
                    fontSize: "12px",
                    fontWeight: 900,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    boxSizing: "border-box",
                  }}
                >
                  Email Guru Kids Pro
                </a>

                <a
                  href={gkpWhatsAppHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: isMobile ? "100%" : "auto",
                    minHeight: "54px",
                    padding: "14px 22px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "999px",
                    border: "1px solid rgba(255,255,255,0.24)",
                    background: "rgba(255,255,255,0.05)",
                    color: "white",
                    textDecoration: "none",
                    fontSize: "12px",
                    fontWeight: 900,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    boxSizing: "border-box",
                  }}
                >
                  WhatsApp 8388 8949
                </a>

                <button
                  type="button"
                  onClick={() => setShowGkpTerms(true)}
                  style={{
                    width: isMobile ? "100%" : "auto",
                    minHeight: "54px",
                    padding: "14px 22px",
                    borderRadius: "999px",
                    border: "1px solid rgba(255,174,92,0.28)",
                    background: "rgba(255,174,92,0.08)",
                    color: "#ffcb92",
                    fontSize: "12px",
                    fontWeight: 900,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    boxSizing: "border-box",
                  }}
                >
                  View GKP Offer T&Cs
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {pricingView !== "gkp" && (
      <section
        style={{
          padding: isMobile ? "78px 20px" : "100px 6vw",
          background:
            "linear-gradient(180deg, rgba(8,22,40,0.8), rgba(2,8,19,0.98))",
          borderTop: "1px solid rgba(142,232,255,0.13)",
        }}
      >
        <div style={{ maxWidth: "1240px", margin: "0 auto" }}>
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
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "38px" : "54px",
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
              border: "1px solid rgba(142,232,255,0.18)",
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: "720px",
                borderCollapse: "collapse",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <thead>
                <tr>
                  {[
                    "Feature",
                    "Science Missions",
                    "Core Missions",
                    "Complete Missions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: "21px 18px",
                        textAlign:
                          heading === "Feature" ? "left" : "center",
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
                {comparisonRows.map((row) => (
                  <tr key={row.feature}>
                    <td
                      style={{
                        padding: "18px",
                        color: "rgba(255,255,255,0.72)",
                        borderBottom:
                          "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      {row.feature}
                    </td>
                    {(["science", "core", "complete"] as const).map(
                      (key) => (
                        <td
                          key={key}
                          style={{
                            padding: "18px",
                            textAlign: "center",
                            color: row[key]
                              ? "#8ee8ff"
                              : "rgba(255,255,255,0.28)",
                            fontWeight: 900,
                            borderBottom:
                              "1px solid rgba(255,255,255,0.07)",
                          }}
                        >
                          {row[key] ? "✓" : "—"}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      )}

      <section
        style={{
          padding: isMobile ? "80px 20px" : "105px 6vw",
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
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "39px" : "54px",
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
                  border: "1px solid rgba(142,232,255,0.18)",
                  background: "rgba(255,255,255,0.035)",
                  overflow: "hidden",
                }}
              >
                <summary
                  style={{
                    padding: "21px 23px",
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
                    padding: "0 23px 23px",
                    color: "rgba(255,255,255,0.68)",
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
              color: "rgba(255,255,255,0.52)",
              fontSize: "13px",
              lineHeight: 1.7,
            }}
          >
            All prices are in Singapore dollars. Prices and plan details are
            shown for preview during the Dreamscape One trial phase. Public
            subscriptions are coming soon. Purchases and rewards remain subject
            to the applicable Terms & Conditions.
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
            <Link href="/terms" style={smallLinkStyle}>
              Terms & Conditions
            </Link>
            <Link href="/privacy" style={smallLinkStyle}>
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
      {showGkpTerms && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gkp-terms-title"
          onClick={() => setShowGkpTerms(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isMobile ? "14px" : "28px",
            background: "rgba(1,4,11,0.78)",
            backdropFilter: "blur(14px)",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              position: "relative",
              width: "min(760px, 100%)",
              maxHeight: "calc(100dvh - 28px)",
              overflowY: "auto",
              padding: isMobile ? "32px 22px 26px" : "42px 40px 34px",
              borderRadius: isMobile ? "24px" : "30px",
              border: "1px solid rgba(255,174,92,0.34)",
              background:
                "radial-gradient(circle at 10% 0%, rgba(83,215,255,0.13), transparent 32%), radial-gradient(circle at 100% 100%, rgba(255,174,92,0.13), transparent 34%), #071326",
              boxShadow:
                "0 34px 100px rgba(0,0,0,0.58), 0 0 36px rgba(255,174,92,0.1)",
              color: "white",
            }}
          >
            <button
              type="button"
              aria-label="Close GKP offer terms"
              onClick={() => setShowGkpTerms(false)}
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                width: "38px",
                height: "38px",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.2)",
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
                color: "#ffbd73",
                fontSize: "11px",
                fontWeight: 900,
                letterSpacing: "0.19em",
                textTransform: "uppercase",
              }}
            >
              Guru Kids Pro Student Offer
            </p>

            <h2
              id="gkp-terms-title"
              style={{
                margin: "15px 42px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "34px" : "44px",
                fontWeight: 400,
                lineHeight: 1.08,
              }}
            >
              Terms & Conditions
            </h2>

            <ol
              style={{
                margin: "26px 0 0",
                paddingLeft: "22px",
                display: "flex",
                flexDirection: "column",
                gap: "15px",
                color: "rgba(255,255,255,0.74)",
                fontSize: isMobile ? "14px" : "15px",
                lineHeight: 1.7,
              }}
            >
              <li>
                This promotion is available only to new student sign-ups for
                eligible Guru Kids Pro Primary English or Primary Mathematics
                classes.
              </li>
              <li>
                The student must complete one full month of the eligible Guru
                Kids Pro class before the free Dreamscape access is confirmed.
              </li>
              <li>
                Each eligible new student receives one month of Full
                Dreamscape Student Access. The free month is limited to one
                redemption per student.
              </li>
              <li>
                The free month’s activation date is determined by Guru Kids
                Pro after eligibility has been verified.
              </li>
              <li>
                After the free month, continued Dreamscape access is charged
                at SGD 9.90/month for GKP Core Access or SGD 14.90/month for
                GKP Full Access.
              </li>
              <li>
                Unless the parent or guardian opts out before the free month
                ends, the selected Dreamscape add-on will be added to the
                student’s normal Guru Kids Pro class billing.
              </li>
              <li>
                GKP Core Access includes English and Mathematics Learning
                Missions. GKP Full Access includes English, Mathematics, and
                Science Learning Missions, together with Milo’s Business
                Builder when it launches.
              </li>
              <li>
                The offer cannot be exchanged for cash, transferred to another
                student, or combined with another introductory Dreamscape
                promotion unless Guru Kids Pro agrees in writing.
              </li>
              <li>
                If the eligible GKP class is cancelled, withdrawn from, or not
                completed for the required first month, Guru Kids Pro may
                withdraw the free access offer.
              </li>
              <li>
                Dreamscape access remains subject to the general Dreamscape One
                Terms & Conditions and Privacy Policy.
              </li>
            </ol>

            <div
              style={{
                marginTop: "27px",
                padding: "18px",
                borderRadius: "18px",
                border: "1px solid rgba(142,232,255,0.18)",
                background: "rgba(255,255,255,0.035)",
                color: "rgba(255,255,255,0.65)",
                fontSize: "13px",
                lineHeight: 1.65,
              }}
            >
              Questions or opt-out requests: admin@gurukidspro.com or WhatsApp
              8388 8949.
            </div>

            <div
              style={{
                marginTop: "23px",
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                flexWrap: "wrap",
                gap: "11px",
              }}
            >
              <button
                type="button"
                onClick={() => setShowGkpTerms(false)}
                style={{
                  width: isMobile ? "100%" : "auto",
                  minHeight: "52px",
                  padding: "13px 22px",
                  border: "none",
                  borderRadius: "999px",
                  background:
                    "linear-gradient(90deg, #8ee8ff, #c58cff 60%, #ffae5c)",
                  color: "#160729",
                  fontSize: "12px",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Close
              </button>

              <Link
                href="/terms"
                style={{
                  width: isMobile ? "100%" : "auto",
                  minHeight: "52px",
                  padding: "13px 22px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.22)",
                  background: "rgba(255,255,255,0.045)",
                  color: "white",
                  textDecoration: "none",
                  fontSize: "12px",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  boxSizing: "border-box",
                }}
              >
                General Terms
              </Link>
            </div>
          </div>
        </div>
      )}

      {showSubscriptionComingSoon && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="subscription-coming-soon-title"
          onClick={() => setShowSubscriptionComingSoon(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 110,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isMobile ? "16px" : "28px",
            background: "rgba(1,4,11,0.8)",
            backdropFilter: "blur(14px)",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              position: "relative",
              width: "min(610px, 100%)",
              padding: isMobile ? "34px 23px 27px" : "45px 42px 36px",
              borderRadius: isMobile ? "25px" : "31px",
              border: "1px solid rgba(142,232,255,0.3)",
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
              onClick={() => setShowSubscriptionComingSoon(false)}
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                width: "38px",
                height: "38px",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.2)",
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
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "37px" : "48px",
                fontWeight: 400,
                lineHeight: 1.08,
              }}
            >
              Subscriptions coming soon
            </h2>

            <p
              style={{
                margin: "22px auto 0",
                maxWidth: "500px",
                color: "rgba(255,255,255,0.72)",
                fontSize: isMobile ? "15px" : "17px",
                lineHeight: 1.7,
              }}
            >
              Free activity zones are open now. Public Student Access
              subscriptions open on 1 October. Authorised staff accounts can
              continue testing the existing Shopify checkout links during the
              preview.
            </p>

            <div
              style={{
                marginTop: "28px",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: "10px",
              }}
            >
              <Link
                href="/milo-world/activity-lab"
                onClick={() => setShowSubscriptionComingSoon(false)}
                style={{
                  minHeight: "54px",
                  padding: "14px 25px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "999px",
                  background:
                    "linear-gradient(90deg, #8ee8ff, #c58cff 60%, #ffae5c)",
                  color: "#160729",
                  textDecoration: "none",
                  fontSize: "12px",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Explore Free Activities
              </Link>

              <button
                type="button"
                onClick={() => setShowSubscriptionComingSoon(false)}
                style={{
                  minHeight: "54px",
                  padding: "14px 25px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.05)",
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

            <p
              style={{
                margin: "17px 0 0",
                color: "rgba(255,255,255,0.45)",
                fontSize: "12px",
                lineHeight: 1.6,
              }}
            >
              Staff testing access remains available to authorised admin,
              teacher and curriculum lead accounts.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
