"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type PlanKey =
  | "core_monthly"
  | "core_annual"
  | "nova_monthly"
  | "nova_annual";

type PlanDetails = {
  name: string;
  access: string;
  price: string;
  cadence: string;
  billingLabel: "monthly" | "annual";
  regularPrice: string;
  launchLabel: string;
  trialEligible: boolean;
};

const STANDARD_TRIAL_DAYS = 7;

const PLAN_DETAILS: Record<PlanKey, PlanDetails> = {
  core_monthly: {
    name: "Core Missions",
    access: "English + Mathematics",
    price: "SGD 19.90",
    cadence: "per month",
    billingLabel: "monthly",
    regularPrice: "SGD 24.90",
    launchLabel: "Launch Price",
    trialEligible: true,
  },
  core_annual: {
    name: "Core Missions",
    access: "English + Mathematics",
    price: "SGD 199",
    cadence: "per year",
    billingLabel: "annual",
    regularPrice: "SGD 249",
    launchLabel: "Launch Price",
    trialEligible: true,
  },
  nova_monthly: {
    name: "NOVA+",
    access: "English + Mathematics + NOVA+ Learning Intelligence",
    price: "SGD 24.90",
    cadence: "per month",
    billingLabel: "monthly",
    regularPrice: "SGD 29.90",
    launchLabel: "Launch Price",
    trialEligible: true,
  },
  nova_annual: {
    name: "NOVA+",
    access: "English + Mathematics + NOVA+ Learning Intelligence",
    price: "SGD 249",
    cadence: "per year",
    billingLabel: "annual",
    regularPrice: "SGD 299",
    launchLabel: "Launch Price",
    trialEligible: true,
  },
};

function resolvePlan(
  plan: string | null,
  cycle: string | null,
): PlanKey | null {
  const billingCycle =
    cycle === "annual" ? "annual" : "monthly";

  if (plan === "core") {
    return billingCycle === "annual"
      ? "core_annual"
      : "core_monthly";
  }

  if (plan === "nova") {
    return billingCycle === "annual"
      ? "nova_annual"
      : "nova_monthly";
  }

  // Full Access / complete is deliberately not accepted here.
  return null;
}

export default function DreamscapeSubscribeClient() {
  const searchParams = useSearchParams();

  const planKey = useMemo(
    () =>
      resolvePlan(
        searchParams.get("plan"),
        searchParams.get("cycle"),
      ),
    [searchParams],
  );

  const plan =
    planKey ? PLAN_DETAILS[planKey] : null;

  const [parentName, setParentName] =
    useState("");

  const [parentEmail, setParentEmail] =
    useState("");

  const [learnerName, setLearnerName] =
    useState("");

  const [learnerEmail, setLearnerEmail] =
    useState("");

  const [guardianAuthorised, setGuardianAuthorised] =
    useState(false);

  const [website, setWebsite] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  async function startSubscription() {
    setError("");

    if (!planKey || !plan) {
      setError(
        "This Dreamscape plan is not currently available for subscription.",
      );
      return;
    }

    if (
      !parentName.trim() ||
      !parentEmail.trim() ||
      !learnerName.trim() ||
      !learnerEmail.trim()
    ) {
      setError(
        "Please complete all parent and learner details.",
      );
      return;
    }

    if (!guardianAuthorised) {
      setError(
        "Please confirm the parent/guardian authorisation.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        "/api/dreamscape/subscriptions/start",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            planKey,
            parentName:
              parentName.trim(),
            parentEmail:
              parentEmail.trim(),
            learnerName:
              learnerName.trim(),
            learnerEmail:
              learnerEmail.trim(),
            guardianAuthorised,
            website,
          }),
        },
      );

      const payload =
        (await response.json().catch(() => null)) as
          | {
              error?: string;
              redirectUrl?: string;
            }
          | null;

      if (
        !response.ok ||
        !payload?.redirectUrl
      ) {
        throw new Error(
          payload?.error ||
            "The Dreamscape subscription could not be started.",
        );
      }

      window.location.assign(
        payload.redirectUrl,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The Dreamscape subscription could not be started.",
      );
      setSubmitting(false);
    }
  }

  if (!planKey || !plan) {
    return (
      <main className="min-h-screen bg-[#020813] px-5 py-8 text-white sm:px-8 sm:py-12">
        <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
          <section className="w-full rounded-[30px] border border-violet-200/20 bg-white/[0.05] p-8 text-center shadow-[0_28px_90px_rgba(0,0,0,0.38)] sm:p-12">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">
              Dreamscape Student Access
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
              This plan is not open for subscription.
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/62 sm:text-base">
              Full Access is Coming Soon. Return to the pricing page to choose Core Missions or NOVA+.
            </p>

            <Link
              href="/pricing"
              className="mt-8 inline-flex min-h-14 items-center justify-center rounded-full bg-gradient-to-r from-cyan-300 via-violet-300 to-orange-300 px-7 text-sm font-black uppercase tracking-[0.1em] text-[#160729] no-underline"
            >
              Back to Pricing
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020813] px-5 py-8 text-white sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/pricing"
            className="rounded-full border border-cyan-200/25 bg-white/[0.05] px-5 py-3 text-sm font-bold text-white no-underline"
          >
            ← Back to Pricing
          </Link>

          <span className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
            Secure recurring checkout by Stripe
          </span>
        </div>

        <section className="mt-10 grid gap-8 lg:grid-cols-[0.88fr_1.12fr]">
          <aside className="h-fit rounded-[30px] border border-cyan-200/20 bg-white/[0.045] p-7 shadow-[0_28px_90px_rgba(0,0,0,0.38)]">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8ee8ff]">
              Selected plan
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-[-0.05em]">
              {plan.name}
            </h1>

            <p className="mt-2 text-sm text-white/56">
              {plan.access}
            </p>

            <div className="mt-7 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-white/38">
                Regular
              </span>

              <span className="text-xl font-bold text-white/38 line-through">
                {plan.regularPrice}
              </span>
            </div>

            <div className="mt-2 flex items-end gap-2">
              <strong className="text-4xl text-white">
                {plan.price}
              </strong>

              <span className="pb-1 text-sm text-white/46">
                {plan.cadence}
              </span>
            </div>

            <p className="mt-3 text-xs font-black uppercase tracking-[0.13em] text-violet-200">
              {plan.launchLabel}
            </p>

            {plan.trialEligible ? (
              <div className="mt-6 rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.055] p-5">
                <p className="m-0 text-xs font-black uppercase tracking-[0.15em] text-cyan-200">
                  Up to {STANDARD_TRIAL_DAYS} days free
                </p>

                <p className="mt-2 text-sm leading-6 text-white/65">
                  Eligible first-time Core Missions users receive a{" "}
                  {STANDARD_TRIAL_DAYS}-day introductory trial on this{" "}
                  {plan.billingLabel} plan. Stripe will show the trial,
                  first billing date and recurring amount before you confirm.
                </p>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-violet-200/18 bg-violet-300/[0.05] p-5">
                <p className="m-0 text-xs font-black uppercase tracking-[0.15em] text-violet-200">
                  NOVA+ Launch Access
                </p>

                <p className="mt-2 text-sm leading-6 text-white/65">
                  NOVA+ is currently offered at its launch price.
                  Stripe will show the recurring amount and billing date before you confirm.
                </p>
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-6 text-white/60">
              Your payment method is entered securely on Stripe&apos;s
              Checkout page. Dreamscape activates learning access only
              after a validated Stripe subscription event confirms the subscription.
            </div>

            <p className="mt-5 text-xs leading-5 text-white/38">
              The subscription is for the learner email entered on this form.
              If that learner does not yet have a Dreamscape account,
              an invitation can be created after activation.
            </p>
          </aside>

          <section className="rounded-[30px] border border-violet-200/20 bg-white/[0.05] p-7 shadow-[0_28px_90px_rgba(0,0,0,0.38)] sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">
              Parent / guardian purchase
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">
              Who is paying and who is learning?
            </h2>

            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <Field label="Parent / payer name">
                <input
                  value={parentName}
                  onChange={(event) =>
                    setParentName(event.target.value)
                  }
                  autoComplete="name"
                  className={inputClass}
                />
              </Field>

              <Field label="Parent / payer email">
                <input
                  type="email"
                  value={parentEmail}
                  onChange={(event) =>
                    setParentEmail(event.target.value)
                  }
                  autoComplete="email"
                  className={inputClass}
                />
              </Field>

              <Field label="Learner full name">
                <input
                  value={learnerName}
                  onChange={(event) =>
                    setLearnerName(event.target.value)
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Learner Dreamscape email">
                <input
                  type="email"
                  value={learnerEmail}
                  onChange={(event) =>
                    setLearnerEmail(event.target.value)
                  }
                  autoComplete="email"
                  className={inputClass}
                />
              </Field>
            </div>

            <input
              aria-hidden="true"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) =>
                setWebsite(event.target.value)
              }
              className="hidden"
            />

            <label className="mt-6 flex items-start gap-3 rounded-2xl border border-cyan-200/16 bg-cyan-300/[0.05] p-4 text-sm leading-6 text-white/70">
              <input
                type="checkbox"
                checked={guardianAuthorised}
                onChange={(event) =>
                  setGuardianAuthorised(event.target.checked)
                }
                className="mt-1 h-4 w-4 accent-cyan-300"
              />

              <span>
                I am the learner&apos;s parent/guardian, or I am
                authorised by the parent/guardian to purchase this
                Dreamscape Student Access subscription.
              </span>
            </label>

            <div className="mt-5 rounded-2xl border border-violet-200/14 bg-violet-300/[0.04] px-4 py-4 text-xs leading-5 text-white/52">
              {plan.trialEligible ? (
                <>
                  Eligible first-time Core Missions users are not charged
                  the subscription fee during the {STANDARD_TRIAL_DAYS}-day trial.
                  Unless cancelled before the trial ends, the selected subscription
                  will begin automatically at {plan.price} {plan.cadence}.
                </>
              ) : (
                <>
                  NOVA+ renews automatically at {plan.price} {plan.cadence} until cancelled.
                  Stripe will show the recurring price and billing date before confirmation.
                </>
              )}
            </div>

            {error && (
              <p className="mt-5 rounded-2xl border border-red-200/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={() =>
                void startSubscription()
              }
              disabled={submitting}
              className="mt-7 min-h-14 w-full rounded-full border border-cyan-100/30 bg-gradient-to-r from-cyan-300 via-violet-300 to-orange-300 px-6 text-sm font-black uppercase tracking-[0.12em] text-[#160729] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {submitting
                ? "Opening secure Stripe checkout…"
                : "Continue to Stripe"}
            </button>

            <p className="mt-5 text-center text-xs leading-5 text-white/38">
              By continuing, you confirm the information above and agree to the{" "}
              <Link
                href="/terms"
                target="_blank"
                className="text-cyan-200 underline underline-offset-2"
              >
                Dreamscape One Terms & Conditions
              </Link>
              , including recurring subscription terms, and acknowledge the{" "}
              <Link
                href="/privacy"
                target="_blank"
                className="text-cyan-200 underline underline-offset-2"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </section>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-bold text-white/58">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "min-h-12 w-full rounded-2xl border border-cyan-200/16 bg-[#061632] px-4 text-sm text-white outline-none transition focus:border-cyan-200/48";
