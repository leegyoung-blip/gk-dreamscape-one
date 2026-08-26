"use client";

import Link from "next/link";

export default function CreatorClubsLockedScreen({
  detail = "Creator Clubs are currently in admin preview while the new creator system is being prepared.",
}: {
  detail?: string;
}) {
  return (
    <main className="fixed inset-0 overflow-hidden bg-[#020711] px-5 text-white">
      <img
        src="/milo-world/quiz-hall/quiz-hall-bg.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-left opacity-24"
      />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(2,7,17,0.98),rgba(2,7,17,0.91))]" />

      <section className="relative z-10 flex h-full items-center justify-center">
        <div className="w-full max-w-[560px] rounded-[30px] border border-amber-200/18 bg-[linear-gradient(145deg,rgba(36,22,11,0.90),rgba(3,11,24,0.96))] p-7 text-center shadow-[0_30px_90px_rgba(0,0,0,0.48)] backdrop-blur-2xl sm:p-9">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200/22 bg-amber-300/[0.08] text-2xl text-amber-100">
            ◇
          </span>

          <p className="mt-5 text-[9px] font-black uppercase tracking-[0.2em] text-amber-100/64">
            Milo’s Quiz Hall
          </p>
          <h1 className="mt-2 font-serif text-4xl font-normal sm:text-5xl">
            Creator Clubs are locked
          </h1>

          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/54">
            {detail}
          </p>

          <p className="mt-3 text-xs leading-5 text-white/34">
            Dreamscape administrators can still enter for testing. Public
            access can be opened from the admin control inside Quiz Hall.
          </p>

          <Link
            href="/milo-world/quiz-hall"
            className="mt-7 inline-flex min-h-[46px] items-center rounded-full border border-amber-200/24 bg-amber-300/[0.10] px-6 text-[10px] font-black uppercase tracking-[0.1em] text-amber-100 no-underline"
          >
            ← Back to Quiz Hall
          </Link>
        </div>
      </section>
    </main>
  );
}
