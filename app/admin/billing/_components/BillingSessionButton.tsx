"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function BillingSessionButton() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [checked, setChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setHasSession(Boolean(data.session));
      setChecked(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setHasSession(Boolean(session));
        setChecked(true);
      },
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const nextPath = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  if (!checked || hasSession) return null;

  return (
    <div className="fixed right-4 top-4 z-[10000] sm:right-6 sm:top-6">
      <Link
        href={`/login?next=${encodeURIComponent(nextPath || "/admin/billing")}`}
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#c9b27d] bg-[#15233b] px-5 text-xs font-black text-white shadow-[0_14px_36px_rgba(21,35,59,0.24)] transition hover:-translate-y-0.5 hover:bg-[#1d3152]"
      >
        Log in
      </Link>
    </div>
  );
}
