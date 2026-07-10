"use client";

import Link from "next/link";

export default function MembershipPage() {
  return (
    <main
      className="relative min-h-screen w-screen overflow-hidden bg-[#140b24] text-white"
      style={{
        backgroundImage: "url('/backgrounds/membership-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/20" />

      <Link
        href="/creator/dreamshop"
        className="absolute left-8 top-8 z-30 rounded-full bg-white/85 px-5 py-2 text-sm font-light tracking-wide text-purple-950 shadow-md backdrop-blur-md transition hover:bg-white"
      >
        ← Back to Dreamshop
      </Link>

      <section className="relative z-20 flex min-h-screen items-center justify-center px-10">
        <div className="rounded-[2.5rem] bg-white/15 px-16 py-14 text-center shadow-2xl backdrop-blur-md">
          <p className="text-sm font-light tracking-[0.3em] text-white/75">
            DREAMSHOP SERVICE
          </p>

          <h1 className="mt-5 text-6xl font-extralight tracking-[0.18em] text-white drop-shadow-lg">
            DREAMSCAPE MEMBERSHIP
          </h1>

          <div className="mx-auto mt-6 h-[1px] w-24 bg-white/50" />

          <p className="mt-8 text-5xl font-extralight tracking-[0.22em] text-white">
            COMING SOON
          </p>
        </div>
      </section>
    </main>
  );
}