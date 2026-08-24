import type { ReactNode } from "react";
import Link from "next/link";

export default function AffiliateAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <div className="fixed bottom-5 left-5 z-[100] flex flex-wrap gap-2 sm:bottom-7 sm:left-7">
        <Link
          href="/admin/dream-tokens"
          aria-label="Back to Dreamscape Admin Panel"
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#6034d4]/20 bg-white/95 px-5 text-sm font-extrabold text-[#17133f] no-underline shadow-[0_16px_45px_rgba(40,24,90,0.18)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#6034d4]/40 hover:bg-[#f8f5ff]"
        >
          ← Back to Admin Panel
        </Link>

        <Link
          href="/admin/affiliates/invite"
          aria-label="Invite an Affiliate"
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#6034d4]/25 bg-[#6034d4] px-5 text-sm font-extrabold text-white no-underline shadow-[0_16px_45px_rgba(40,24,90,0.22)] transition hover:-translate-y-0.5 hover:bg-[#5127c0]"
        >
          + Invite Affiliate
        </Link>
      </div>

      {children}
    </>
  );
}
