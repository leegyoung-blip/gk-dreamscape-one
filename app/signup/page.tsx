"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

export default function SignupRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const incoming = new URLSearchParams(window.location.search);
    const outgoing = new URLSearchParams();

    outgoing.set("mode", "signup");

    const referralCode = incoming.get("ref")?.trim().toUpperCase();
    const nextPath = safeNextPath(incoming.get("next"));

    if (referralCode) {
      outgoing.set("ref", referralCode);
    }

    if (nextPath) {
      outgoing.set("next", nextPath);
    }

    router.replace(`/login?${outgoing.toString()}`);
  }, [router]);

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[#020813] px-4 text-white"
    >
      Opening Dreamscape sign up...
    </main>
  );
}
