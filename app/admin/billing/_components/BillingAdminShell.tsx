"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
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
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Overview",
    icon: "▦",
    href: "/admin/billing",
  },
  {
    label: "Billing Accounts",
    icon: "◎",
    href: "/admin/billing/accounts",
  },
  {
    label: "Programmes",
    icon: "▤",
    href: "/admin/billing/programmes",
  },
  {
    label: "Invoices",
    icon: "□",
    phase: "Phase 4",
  },
  {
    label: "Payments",
    icon: "$",
    phase: "Phase 6",
  },
  {
    label: "Settings",
    icon: "⚙",
    phase: "Later",
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

  const [accessStatus, setAccessStatus] =
    useState<AccessStatus>("checking");
  const [accessError, setAccessError] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [roleLabel, setRoleLabel] = useState("Billing staff");

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

  if (accessStatus === "checking") {
    return <FullPageMessage text="Checking GKP billing access…" />;
  }

  if (accessStatus === "locked") {
    return (
      <main className="min-h-screen bg-[#f5f2ea] p-6 text-[#15233b]">
        <div className="mx-auto mt-16 max-w-xl rounded-[2rem] border border-[#dfd5c1] bg-white p-8 shadow-[0_24px_70px_rgba(21,35,59,0.08)]">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#a27627]">
            Guru Kids Pro Billing
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Access restricted</h1>
          <p className="mt-4 leading-7 text-[#667085]">
            This workspace is available only to Dreamscape administrators and
            active billing staff.
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
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#15233b] text-sm font-black text-[#e8c474]"
            >
              GKP
            </Link>
            <div className="min-w-0">
              <p className="truncate text-sm font-black">
                Guru Kids Pro Billing
              </p>
              <p className="truncate text-xs text-[#7b756a]">
                {userEmail || roleLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

      <div className="grid min-h-[calc(100vh-81px)] lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="border-b border-[#ded5c4] bg-[#ebe4d8] px-4 py-4 lg:border-b-0 lg:border-r lg:px-3 lg:py-5">
          <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:sticky lg:top-[101px] lg:grid-cols-1">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/admin/billing"
                  ? pathname === item.href
                  : Boolean(item.href && pathname.startsWith(item.href));

              if (!item.href) {
                return (
                  <div
                    key={item.label}
                    className="min-h-12 cursor-not-allowed rounded-2xl border border-transparent bg-white/45 px-3 py-2 text-left text-[#4f4a42] opacity-65"
                  >
                    <NavContent
                      icon={item.icon}
                      label={item.label}
                      phase={item.phase}
                      active={false}
                    />
                  </div>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`min-h-12 rounded-2xl border px-3 py-2 text-left transition ${
                    active
                      ? "border-[#15233b] bg-[#15233b] text-white"
                      : "border-transparent bg-white/45 text-[#4f4a42] hover:bg-white"
                  }`}
                >
                  <NavContent
                    icon={item.icon}
                    label={item.label}
                    active={active}
                  />
                </Link>
              );
            })}

            <div className="col-span-2 mt-2 hidden rounded-2xl border border-[#d8c9ad] bg-white/65 p-4 text-xs leading-5 text-[#6f675a] sm:col-span-3 lg:col-span-1 lg:block">
              <strong className="block text-[#15233b]">Phase 3</strong>
              Family accounts, students, programmes and individual enrolment
              fees are active.
            </div>
          </nav>
        </aside>

        <section className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
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
                <div className="flex flex-wrap items-center gap-2">
                  {actions}
                </div>
              )}
            </div>

            <div className="mt-7">{children}</div>
          </div>
        </section>
      </div>
    </main>
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
