"use client";

import Link from "next/link";
import BillingAdminShell from "./_components/BillingAdminShell";

const WORKSPACES = [
  {
    name: "Guru Kids Pro",
    eyebrow: "Tuition operations",
    href: "/admin/billing/gkp",
    description:
      "Manage families, programmes, lesson scheduling, tuition invoices, payments and Guru Kids Pro accounting.",
    features: [
      "Billing accounts & students",
      "Programmes & lesson scheduling",
      "Invoices & payments",
      "GKP accounting",
      "Staff payments",
    ],
    icon: "GKP",
  },
  {
    name: "Dreamscape One",
    eyebrow: "Subscription operations",
    href: "/admin/billing/dreamscape",
    description:
      "Manage Dreamscape subscribers, plans, recurring payments and company-specific finance from a workspace separate from Guru Kids Pro.",
    features: [
      "Subscribers & plans",
      "Recurring billing",
      "Payments & refunds",
      "Dreamscape accounting",
      "Staff payments",
    ],
    icon: "D1",
  },
] as const;

export default function BillingPlatformLandingClient() {
  return (
    <BillingAdminShell
      eyebrow="Dreamscape One administration"
      title="Billing Platform"
      description="Choose the company workspace you want to manage. Guru Kids Pro tuition billing and Dreamscape One subscription billing remain separate while sharing the same administration platform."
    >
      <div className="grid gap-5 xl:grid-cols-2">
        {WORKSPACES.map((workspace) => (
          <Link
            key={workspace.name}
            href={workspace.href}
            className="group rounded-[2rem] border border-[#ded5c4] bg-white p-6 shadow-[0_20px_60px_rgba(21,35,59,0.05)] transition hover:-translate-y-0.5 hover:border-[#c8a45c] hover:shadow-[0_24px_70px_rgba(21,35,59,0.09)] sm:p-7"
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#a27627]">
                  {workspace.eyebrow}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#15233b] sm:text-3xl">
                  {workspace.name}
                </h2>
              </div>
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#15233b] text-xs font-black text-[#e8c474]">
                {workspace.icon}
              </span>
            </div>

            <p className="mt-5 max-w-xl text-sm leading-6 text-[#6f6a61]">
              {workspace.description}
            </p>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {workspace.features.map((feature) => (
                <span
                  key={feature}
                  className="rounded-xl border border-[#e6dfd3] bg-[#fbfaf7] px-3 py-2 text-xs font-bold text-[#625b50]"
                >
                  {feature}
                </span>
              ))}
            </div>

            <div className="mt-7 flex items-center justify-between border-t border-[#eee8dd] pt-5">
              <span className="text-xs font-bold text-[#82796d]">
                Open company workspace
              </span>
              <span className="text-lg font-black text-[#a27627] transition group-hover:translate-x-1">
                →
              </span>
            </div>
          </Link>
        ))}
      </div>

      <section className="mt-6 rounded-[2rem] border border-[#ded5c4] bg-[#15233b] p-5 text-white shadow-[0_20px_60px_rgba(21,35,59,0.10)] sm:p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#e8c474]">
          Phase 1–6 status
        </p>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-white/75">
          The platform is separated by company. Guru Kids Pro and Dreamscape One now have separate billing, payroll and accounting workspaces, with YTD reporting, payroll analysis, CSV exports and a Dreamscape refund journal. Staff identity can be shared, while payroll, operating expenses and company financial results remain separate.
        </p>
      </section>
    </BillingAdminShell>
  );
}
