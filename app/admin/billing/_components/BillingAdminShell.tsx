"use client";



import Link from "next/link";

import { usePathname, useRouter } from "next/navigation";

import type { ReactNode } from "react";

import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";



type AccessStatus = "checking" | "allowed" | "locked" | "error";



type BillingAdminShellProps = {

  eyebrow: string;

  title: string;

  description: string;

  actions?: ReactNode;

  children: ReactNode;

};



type NavItem = {

  label: string;

  icon: string;

  href?: string;


  phase?: string;
  adminOnly?: boolean;

};

type NavGroup = {

  label: string;

  items: NavItem[];

};



type BillingWalkthroughStep = {

  eyebrow: string;

  title: string;

  text: string;

  highlightedNav?: string;

};



const BILLING_GUIDE_STORAGE_KEY =

  "gkp-billing-milo-guide-completed-v1";



const GKP_NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Overview",
        icon: "▦",
        href: "/admin/billing/gkp",
      },
    ],
  },
  {
    label: "Customers & Classes",
    items: [
      {
        label: "Billing Accounts",
        icon: "◎",
        href: "/admin/billing/gkp/accounts",
      },
      {
        label: "Programmes",
        icon: "▤",
        href: "/admin/billing/gkp/programmes",
      },
      {
        label: "Lesson Scheduling",
        icon: "◫",
        href: "/admin/billing/gkp/lesson-scheduling",
      },
    ],
  },
  {
    label: "Billing",
    items: [
      {
        label: "Invoices",
        icon: "□",
        href: "/admin/billing/gkp/invoices",
      },
      {
        label: "Payments",
        icon: "$",
        href: "/admin/billing/gkp/payments",
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Staff Payments",
        icon: "¤",
        href: "/admin/billing/gkp/staff-payments",
        adminOnly: true,
      },
      {
        label: "Accounting",
        icon: "∑",
        href: "/admin/billing/gkp/accounting",
        adminOnly: true,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Settings",
        icon: "⚙",
        href: "/admin/billing/gkp/settings",
      },
    ],
  },
];

const DREAMSCAPE_NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Overview",
        icon: "▦",
        href: "/admin/billing/dreamscape",
      },
    ],
  },
  {
    label: "Subscriptions",
    items: [
      {
        label: "Subscribers",
        icon: "◎",
        href: "/admin/billing/dreamscape/subscribers",
      },
      {
        label: "Plans",
        icon: "▤",
        href: "/admin/billing/dreamscape/plans",
      },
    ],
  },
  {
    label: "Billing",
    items: [
      {
        label: "Payments & Refunds",
        icon: "$",
        href: "/admin/billing/dreamscape/payments",
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Staff Payments",
        icon: "¤",
        href: "/admin/billing/dreamscape/staff-payments",
        adminOnly: true,
      },
      {
        label: "Accounting",
        icon: "∑",
        href: "/admin/billing/dreamscape/accounting",
        adminOnly: true,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Settings",
        icon: "⚙",
        href: "/admin/billing/dreamscape/settings",
      },
    ],
  },
];


const GKP_BILLING_GUIDE: BillingWalkthroughStep[] = [
  {
    eyebrow: "Welcome",
    title: "Let me show you the Guru Kids Pro billing workspace.",
    text:
      "This workspace manages family accounts, class schedules, tuition invoices, payments, staff costs and Guru Kids Pro financial reporting. Dreamscape One subscription billing now lives in its own company workspace.",
  },
  {
    eyebrow: "Stop 1 of 10",
    title: "Start with the GKP overview.",
    text:
      "Use Overview as the billing health check. It summarises issued tuition invoices, money collected, outstanding balances, overdue invoices and drafts awaiting review.",
    highlightedNav: "Overview",
  },
  {
    eyebrow: "Stop 2 of 10",
    title: "Keep each family together in Billing Accounts.",
    text:
      "Create one billing account for each family, add each child separately, then attach the child's programmes, agreed fee, recurring discount and enrolment dates.",
    highlightedNav: "Billing Accounts",
  },
  {
    eyebrow: "Stop 3 of 10",
    title: "Use Programmes as your standard fee templates.",
    text:
      "Programmes stores the normal programme name, fee and billing frequency. Individual enrolments can still use a different agreed fee when needed.",
    highlightedNav: "Programmes",
  },
  {
    eyebrow: "Stop 4 of 10",
    title: "Use Lesson Scheduling as the live class reference.",
    text:
      "Filter by level, subject and day, check class headcount and remaining spaces, and maintain multi-level schedules before offering parents a class time.",
    highlightedNav: "Lesson Scheduling",
  },
  {
    eyebrow: "Stop 5 of 10",
    title: "Prepare and review invoices before issuing.",
    text:
      "Confirm lesson dates and centre closures, generate the month, review every draft, make any permitted adjustments, preview the parent document, then issue only when it is correct.",
    highlightedNav: "Invoices",
  },
  {
    eyebrow: "Stop 6 of 10",
    title: "Use Payments for reconciliation.",
    text:
      "Payments keeps provider and manual receipts, refunds, unmatched events and overpayments separate from invoice preparation. Record money only after it has actually been received or returned.",
    highlightedNav: "Payments",
  },
  {
    eyebrow: "Stop 7 of 10",
    title: "Staff Payments is the payroll ledger.",
    text:
      "Administrators can record management salaries, teacher or contractor pay, bonuses, allowances, deductions and payment history. Payroll is kept separate from ordinary operating expenses.",
    highlightedNav: "Staff Payments",
  },
  {
    eyebrow: "Stop 8 of 10",
    title: "Accounting is GKP-only.",
    text:
      "Guru Kids Pro Accounting combines tuition collections, refunds, payroll and GKP operating expenses. Dreamscape subscription revenue and Dreamscape costs never enter this company view.",
    highlightedNav: "Accounting",
  },
  {
    eyebrow: "Stop 9 of 10",
    title: "Use Settings for GKP billing rules.",
    text:
      "Settings holds Guru Kids Pro billing details such as invoice wording and due-date rules. Stripe secrets and other protected credentials remain server-side.",
    highlightedNav: "Settings",
  },
  {
    eyebrow: "Stop 10 of 10",
    title: "Use the same safe order each month.",
    text:
      "Update accounts and enrolments first, confirm lesson schedules second, generate drafts third, review fourth, issue fifth and reconcile payments last. Keep issued and paid history intact.",
  },
];

const DREAMSCAPE_BILLING_GUIDE: BillingWalkthroughStep[] = [
  {
    eyebrow: "Welcome",
    title: "Let me show you the Dreamscape One billing workspace.",
    text:
      "This workspace manages public Dreamscape subscriptions, Stripe billing, refunds, Dreamscape staff costs and Dreamscape-only financial reporting. Guru Kids Pro tuition billing stays in the other company workspace.",
  },
  {
    eyebrow: "Stop 1 of 7",
    title: "Start with the Dreamscape overview.",
    text:
      "Overview shows active subscribers, payment issues, setup-pending subscriptions, MRR, annual contract value and items that need review.",
    highlightedNav: "Overview",
  },
  {
    eyebrow: "Stop 2 of 7",
    title: "Use Subscribers for subscription management.",
    text:
      "Subscribers is the operational directory for learner contracts. Review the parent and learner, plan, Stripe status, access period, payment history and subscription actions from here.",
    highlightedNav: "Subscribers",
  },
  {
    eyebrow: "Stop 3 of 7",
    title: "Keep plan configuration in Plans.",
    text:
      "Plans shows the Dreamscape products and their billing cycles, prices, availability and Stripe mappings. Provider credentials remain protected on the server.",
    highlightedNav: "Plans",
  },
  {
    eyebrow: "Stop 4 of 7",
    title: "Use Payments & Refunds for transaction history.",
    text:
      "Review successful subscription payments and the refund journal separately. Refund reporting flows into Dreamscape Accounting without affecting Guru Kids Pro.",
    highlightedNav: "Payments & Refunds",
  },
  {
    eyebrow: "Stop 5 of 7",
    title: "Staff Payments is Dreamscape-only payroll.",
    text:
      "Administrators can record Dreamscape salaries, contractor pay, bonuses, allowances and deductions. A person can also work for GKP, but each company keeps a separate employment and payment record.",
    highlightedNav: "Staff Payments",
  },
  {
    eyebrow: "Stop 6 of 7",
    title: "Accounting keeps Dreamscape finances separate.",
    text:
      "Dreamscape Accounting tracks subscription collections, Stripe refunds, payroll, affiliate payouts, operating expenses, MRR and reporting trends without mixing in GKP tuition.",
    highlightedNav: "Accounting",
  },
  {
    eyebrow: "Stop 7 of 7",
    title: "Use Settings for subscription controls.",
    text:
      "Dreamscape Settings controls public subscription checkout and billing behaviour. Stripe secret keys, webhook secrets and protected Price IDs remain server-side.",
    highlightedNav: "Settings",
  },
];


export default function BillingAdminShell({

  eyebrow,

  title,

  description,

  actions,

  children,

}: BillingAdminShellProps) {

  const router = useRouter();

  const pathname = usePathname();

  const workspace =
    pathname === "/admin/billing"
      ? "platform"
      : pathname.startsWith("/admin/billing/dreamscape")
        ? "dreamscape"
        : "gkp";

  const navGroups =
    workspace === "dreamscape" ? DREAMSCAPE_NAV_GROUPS : GKP_NAV_GROUPS;

  const workspaceLabel =
    workspace === "gkp"
      ? "Guru Kids Pro"
      : workspace === "dreamscape"
        ? "Dreamscape One"
        : "Company selector";

  const guideSteps =
    workspace === "dreamscape"
      ? DREAMSCAPE_BILLING_GUIDE
      : GKP_BILLING_GUIDE;

  const guideStorageKey =
    workspace === "dreamscape"
      ? "billing-guide-completed-dreamscape-v1"
      : "billing-guide-completed-gkp-v2";



  const [accessStatus, setAccessStatus] =

    useState<AccessStatus>("checking");

  const [accessError, setAccessError] = useState("");

  const [userEmail, setUserEmail] = useState("");

  const [roleLabel, setRoleLabel] = useState("Billing staff");
  const [isAdministrator, setIsAdministrator] = useState(false);



  const [guideOpen, setGuideOpen] = useState(false);

  const [guideStep, setGuideStep] = useState(0);

  const [guideCompleted, setGuideCompleted] = useState(true);



  const highlightedNav = useMemo(

    () =>

      guideOpen

        ? guideSteps[guideStep]?.highlightedNav

        : undefined,

    [guideOpen, guideStep, guideSteps],

  );



  useEffect(() => {

    let active = true;



    async function checkAccess() {

      const {

        data: { user },

        error: userError,

      } = await supabase.auth.getUser();



      if (!active) return;



      if (userError) {

        setAccessError(userError.message);

        setAccessStatus("error");

        return;

      }



      if (!user) {

        router.replace("/login");

        return;

      }



      setUserEmail(user.email ?? "");



      const [accessResult, profileResult] = await Promise.all([

        supabase.rpc("gkp_is_billing_staff"),

        supabase

          .from("profiles")

          .select("role")

          .eq("id", user.id)

          .maybeSingle(),

      ]);



      if (!active) return;



      if (accessResult.error) {

        setAccessError(

          `Billing access check failed: ${accessResult.error.message}`,

        );

        setAccessStatus("error");

        return;

      }



      if (!Boolean(accessResult.data)) {

        setAccessStatus("locked");

        return;

      }



      const rawRole = String(profileResult.data?.role || "")

        .trim()

        .toLowerCase();



      setIsAdministrator(rawRole === "admin");

      if (rawRole === "admin") {

        setRoleLabel("Administrator");

      } else if (rawRole) {

        setRoleLabel(

          rawRole

            .replaceAll("_", " ")

            .replaceAll("-", " ")

            .replace(/\b\w/g, (letter) => letter.toUpperCase()),

        );

      }



      setAccessStatus("allowed");

    }



    void checkAccess();



    return () => {

      active = false;

    };

  }, [router]);



  useEffect(() => {

    try {

      setGuideCompleted(
        workspace === "platform" ||
          window.localStorage.getItem(guideStorageKey) === "true",
      );

    } catch {

      setGuideCompleted(true);

    }

  }, [guideStorageKey, workspace]);



  useEffect(() => {
    setGuideStep(0);
    setGuideOpen(false);
  }, [workspace]);



  function startGuide() {

    setGuideStep(0);

    setGuideOpen(true);

  }



  function closeGuide() {

    setGuideOpen(false);

    setGuideCompleted(true);



    try {

      window.localStorage.setItem(guideStorageKey, "true");

    } catch {

      // The walkthrough still works if browser storage is unavailable.

    }

  }



  if (accessStatus === "checking") {

    return <FullPageMessage text="Checking billing access…" />;

  }



  if (accessStatus === "locked") {

    return (

      <main className="min-h-screen bg-[#f5f2ea] p-6 text-[#15233b]">

        <div className="mx-auto mt-16 max-w-xl rounded-[2rem] border border-[#dfd5c1] bg-white p-8 shadow-[0_24px_70px_rgba(21,35,59,0.08)]">

          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#a27627]">

            Billing Platform

          </p>

          <h1 className="mt-3 text-3xl font-semibold">Access restricted</h1>

          <p className="mt-4 leading-7 text-[#667085]">

            This workspace is available to Dreamscape administrators, curriculum

            leads and active billing staff.

          </p>

          <Link

            href="/profile"

            className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-[#15233b] px-6 text-sm font-bold text-white"

          >

            Return to profile

          </Link>

        </div>

      </main>

    );

  }



  if (accessStatus === "error") {

    return (

      <main className="min-h-screen bg-[#f5f2ea] p-6 text-[#15233b]">

        <div className="mx-auto mt-16 max-w-2xl rounded-[2rem] border border-red-200 bg-white p-8 shadow-[0_24px_70px_rgba(21,35,59,0.08)]">

          <p className="text-xs font-black uppercase tracking-[0.22em] text-red-600">

            Billing setup error

          </p>

          <h1 className="mt-3 text-3xl font-semibold">

            The billing workspace could not open

          </h1>

          <p className="mt-4 break-words leading-7 text-[#667085]">

            {accessError}

          </p>

        </div>

      </main>

    );

  }



  return (
    <main className="min-h-screen bg-[#f5f2ea] text-[#15233b]">
      <header className="sticky top-0 z-40 border-b border-[#ded5c4] bg-[#f5f2ea]/95 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="flex min-h-14 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/admin/billing"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#15233b] text-xs font-black text-[#e8c474]"
              aria-label="Open Billing Platform company selector"
            >
              BP
            </Link>
            <div className="min-w-0">
              <p className="truncate text-sm font-black">Billing Platform</p>
              <p className="truncate text-xs text-[#7b756a]">
                {workspaceLabel} · {userEmail || roleLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {workspace !== "platform" && (
              <Link
                href="/admin/billing"
                className="hidden min-h-10 items-center rounded-full border border-[#d7c9ae] bg-white px-4 text-xs font-bold text-[#554d40] sm:inline-flex"
              >
                Switch company
              </Link>
            )}
            <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 md:inline-flex">
              {roleLabel}
            </span>
            <Link
              href="/profile"
              className="inline-flex min-h-10 items-center rounded-full bg-[#15233b] px-4 text-xs font-bold text-white"
            >
              Profile
            </Link>
          </div>
        </div>
      </header>

      <div
        className={
          workspace === "platform"
            ? "min-h-[calc(100vh-81px)]"
            : "grid min-h-[calc(100vh-81px)] lg:grid-cols-[250px_minmax(0,1fr)]"
        }
      >
        {workspace !== "platform" && (
          <aside className="border-b border-[#ded5c4] bg-[#ebe4d8] px-4 py-4 lg:border-b-0 lg:border-r lg:px-3 lg:py-5">
            <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:sticky lg:top-[101px] lg:grid-cols-1">
              <Link
                href="/admin/billing"
                className="col-span-2 mb-1 inline-flex min-h-10 items-center rounded-xl border border-[#d8c9ad] bg-white/70 px-3 text-xs font-black text-[#6f675a] transition hover:bg-white sm:col-span-3 lg:col-span-1"
              >
                ← Billing Platform
              </Link>

              {navGroups.map((group) => (
                <div
                  key={group.label}
                  className="col-span-2 sm:col-span-3 lg:col-span-1"
                >
                  <p className="mb-1.5 mt-2 px-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#8a8175] first:mt-0">
                    {group.label}
                  </p>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
                    {group.items.map((item) => {
                      const active = Boolean(
                        item.href &&
                          (item.href === "/admin/billing/gkp" ||
                          item.href === "/admin/billing/dreamscape"
                            ? pathname === item.href
                            : pathname.startsWith(item.href)),
                      );

                      const walkthroughHighlighted =
                        guideOpen &&
                        highlightedNav === item.label;

                      const sharedClassName = `relative min-h-12 rounded-2xl border px-3 py-2 text-left transition ${
                        walkthroughHighlighted
                          ? "z-[75] border-cyan-300 bg-[#15233b] text-white ring-4 ring-cyan-300/30 shadow-[0_0_42px_rgba(34,211,238,0.5)]"
                          : active
                            ? "border-[#15233b] bg-[#15233b] text-white"
                            : "border-transparent bg-white/45 text-[#4f4a42]"
                      }`;

                      if (item.adminOnly && !isAdministrator) {
                        return (
                          <div
                            key={item.label}
                            className={`${sharedClassName} cursor-not-allowed opacity-55`}
                            title={`${item.label} is restricted to administrators.`}
                            aria-disabled="true"
                          >
                            <NavContent
                              icon="🔒"
                              label={item.label}
                              phase="Admin only"
                              active={false}
                            />
                          </div>
                        );
                      }

                      if (!item.href) {
                        return (
                          <div
                            key={item.label}
                            className={`${sharedClassName} cursor-not-allowed ${
                              walkthroughHighlighted ? "" : "opacity-60"
                            }`}
                            title={
                              item.phase
                                ? `${item.label} is scheduled for ${item.phase}.`
                                : undefined
                            }
                          >
                            <NavContent
                              icon={item.icon}
                              label={item.label}
                              phase={item.phase}
                              active={active || walkthroughHighlighted}
                            />
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={`${sharedClassName} ${
                            walkthroughHighlighted || active
                              ? ""
                              : "hover:bg-white"
                          }`}
                        >
                          <NavContent
                            icon={item.icon}
                            label={item.label}
                            phase={item.phase}
                            active={active || walkthroughHighlighted}
                          />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="col-span-2 mt-2 hidden rounded-2xl border border-[#d8c9ad] bg-white/65 p-4 text-xs leading-5 text-[#6f675a] sm:col-span-3 lg:col-span-1 lg:block">
                <strong className="block text-[#15233b]">
                  {workspaceLabel} workspace
                </strong>
                {workspace === "gkp"
                  ? "Families, programmes, class scheduling, invoices, payments, staff costs and GKP financial reporting."
                  : "Subscribers, plans, payments, staff costs and Dreamscape financial reporting."}
              </div>
            </nav>
          </aside>
        )}

        <section className="min-w-0 px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:py-8 lg:pb-28">
          <div className="mx-auto max-w-[1500px]">
            <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#a27627]">
                  {eyebrow}
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                  {title}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6f6a61] sm:text-base">
                  {description}
                </p>
              </div>

              {actions && (
                <div className="flex flex-wrap items-center gap-2">{actions}</div>
              )}
            </div>

            <div className="mt-7">{children}</div>
          </div>
        </section>
      </div>

      {workspace !== "platform" && !guideOpen && (
        <button
          type="button"
          onClick={startGuide}
          className="fixed bottom-3 left-3 z-50 flex min-h-14 items-center gap-3 rounded-2xl border border-cyan-300/50 bg-[#07172d]/95 py-2 pl-2 pr-4 text-left text-white shadow-[0_22px_55px_rgba(0,0,0,0.34),0_0_28px_rgba(34,211,238,0.18)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-cyan-200 sm:bottom-5 sm:left-5"
          aria-label="Open Milo’s billing walkthrough"
        >
          <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-cyan-300/35 bg-[#0c2844]">
            <img
              src="/milo-world/milo-character.png"
              alt=""
              className="h-16 w-auto translate-y-2 object-contain"
            />
          </span>
          <span>
            <span className="flex items-center gap-2">
              <strong className="block text-sm font-black">Milo Guide</strong>
              {!guideCompleted && (
                <span className="rounded-full bg-cyan-300 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#07172d]">
                  New
                </span>
              )}
            </span>
            <span className="mt-0.5 block text-[11px] text-white/60">
              {workspaceLabel} walkthrough
            </span>
          </span>
        </button>
      )}

      {workspace !== "platform" && (
        <BillingGuidedWalkthrough
          open={guideOpen}
          stepIndex={guideStep}
          onStepChange={setGuideStep}
          onClose={closeGuide}
          steps={guideSteps}
          workspaceLabel={workspaceLabel}
        />
      )}
    </main>
  );
}



function BillingGuidedWalkthrough({

  open,

  stepIndex,

  onStepChange,

  onClose,
  steps,
  workspaceLabel,

}: {

  open: boolean;

  stepIndex: number;

  onStepChange: (nextStep: number) => void;

  onClose: () => void;

  steps: BillingWalkthroughStep[];

  workspaceLabel: string;

}) {

  const step = steps[stepIndex] ?? steps[0];



  const isFirstStep = stepIndex === 0;

  const isLastStep = stepIndex === steps.length - 1;



  const [typedLength, setTypedLength] = useState(0);



  useEffect(() => {

    if (!open) {

      setTypedLength(0);

      return;

    }



    setTypedLength(0);



    const interval = window.setInterval(() => {

      setTypedLength((current) => {

        if (current >= step.text.length) {

          window.clearInterval(interval);

          return current;

        }



        return current + 1;

      });

    }, 14);



    return () => window.clearInterval(interval);

  }, [open, step.text]);



  useEffect(() => {

    if (!open) return;



    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";



    function closeOnEscape(event: KeyboardEvent) {

      if (event.key === "Escape") onClose();

    }



    document.addEventListener("keydown", closeOnEscape);



    return () => {

      document.body.style.overflow = previousOverflow;

      document.removeEventListener("keydown", closeOnEscape);

    };

  }, [open, onClose]);



  if (!open) return null;



  return (

    <>

      <div

        aria-hidden="true"

        className="fixed inset-0 z-[60] bg-[#00030c]/75 backdrop-blur-[3px]"

      />



      <div

        role="dialog"

        aria-modal="true"

        aria-label={`Milo’s ${workspaceLabel} billing walkthrough`}

        className="fixed bottom-3 left-3 right-3 z-[80] max-h-[72dvh] overflow-y-auto rounded-[1.4rem] border border-cyan-200/40 bg-[linear-gradient(145deg,rgba(4,17,34,0.99),rgba(3,9,24,0.99))] p-5 text-white shadow-[0_32px_90px_rgba(0,0,0,0.68),0_0_40px_rgba(83,215,255,0.12)] sm:bottom-6 sm:left-6 sm:right-auto sm:w-[min(540px,calc(100vw-48px))] sm:overflow-visible sm:rounded-[1.65rem] sm:py-6 sm:pl-[190px] sm:pr-7"

      >

        <button

          type="button"

          aria-label="Close walkthrough"

          onClick={onClose}

          className="absolute right-3.5 top-3.5 z-[3] grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-white/[0.08] text-xl text-white"

        >

          ×

        </button>



        <img

          src="/milo-world/milo-character.png"

          alt="Milo"

          className="relative mx-auto mb-2 block h-[110px] w-auto object-contain drop-shadow-[0_18px_36px_rgba(0,0,0,0.52)] pointer-events-none sm:absolute sm:-bottom-2 sm:left-[18px] sm:m-0 sm:h-[245px]"

        />



        <p className="m-0 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200">

          {step.eyebrow}

        </p>



        <h2 className="mr-10 mt-2 font-serif text-[1.7rem] font-medium leading-[1.08] sm:text-[2.15rem]">

          {step.title}

        </h2>



        <p className="mt-3 min-h-[88px] text-sm leading-[1.58] text-white/80 sm:min-h-[104px] sm:text-base">

          {step.text.slice(0, typedLength)}

          {typedLength < step.text.length && (

            <span

              aria-hidden="true"

              className="ml-1 inline-block h-4 w-[7px] translate-y-0.5 bg-white/70"

            />

          )}

        </p>



        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">

          <div

            aria-label={`Walkthrough step ${stepIndex + 1} of ${steps.length}`}

            className="flex items-center gap-1.5"

          >

            {steps.map((_, index) => (

              <span

                key={index}

                className={`h-[7px] rounded-full transition-all ${

                  index === stepIndex

                    ? "w-[22px] bg-cyan-200"

                    : "w-[7px] bg-white/20"

                }`}

              />

            ))}

          </div>



          <div className="flex gap-2">

            {!isFirstStep && (

              <button

                type="button"

                onClick={() => onStepChange(stepIndex - 1)}

                className="min-h-11 rounded-xl border border-white/20 bg-white/[0.06] px-4 text-sm font-bold text-white"

              >

                Back

              </button>

            )}



            <button

              type="button"

              onClick={() =>

                isLastStep

                  ? onClose()

                  : onStepChange(stepIndex + 1)

              }

              className="min-h-11 rounded-xl border border-cyan-300/40 bg-cyan-300/15 px-5 text-sm font-black text-white"

            >

              {isLastStep

                ? "Finish Guide"

                : isFirstStep

                  ? "Show Me"

                  : "Next"}

            </button>

          </div>

        </div>

      </div>

    </>

  );

}



function NavContent({

  icon,

  label,

  phase,

  active,

}: {

  icon: string;

  label: string;

  phase?: string;

  active: boolean;

}) {

  return (

    <span className="flex items-center gap-3">

      <span

        className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-black ${

          active

            ? "bg-white/10 text-[#e8c474]"

            : "bg-[#e8dfcf] text-[#7d6234]"

        }`}

      >

        {icon}

      </span>

      <span className="min-w-0 flex-1">

        <strong className="block truncate text-sm">{label}</strong>

        {phase && (

          <small className="block truncate text-[10px] font-bold uppercase tracking-[0.1em] opacity-60">

            {phase}

          </small>

        )}

      </span>

    </span>

  );

}



function FullPageMessage({ text }: { text: string }) {

  return (

    <main className="grid min-h-screen place-items-center bg-[#f5f2ea] p-6 text-[#15233b]">

      <div className="rounded-3xl border border-[#dfd5c1] bg-white px-7 py-6 text-sm font-bold shadow-[0_20px_60px_rgba(21,35,59,0.08)]">

        {text}

      </div>

    </main>

  );

}
