"use client";

import Link from "next/link";
import { useEffect } from "react";

const shellCards = [
  {
    icon: "◎",
    title: "Niche Quiz Communities",
    description:
      "Creator-led clubs can focus on specific interests, from geography and science to sport, entertainment and culture.",
  },
  {
    icon: "↗",
    title: "Community Competition",
    description:
      "Members will be able to compete in club challenges, compare results and climb community rankings.",
  },
  {
    icon: "◇",
    title: "Creator Quiz Packs",
    description:
      "Creators will be able to publish premium one-time-purchase quiz packs for their own audiences.",
  },
];

export default function CreatorClubsShellPage() {
  useEffect(() => {
    const oldBody = document.body.style.overflow;
    const oldHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = oldBody;
      document.documentElement.style.overflow = oldHtml;
    };
  }, []);

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#020711] text-white">
      <img
        src="/milo-world/quiz-hall/quiz-hall-bg.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-left opacity-35"
      />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(2,7,17,0.97)_0%,rgba(2,7,17,0.91)_52%,rgba(2,7,17,0.72)_100%)]" />

      <header className="relative z-10 flex items-center justify-between gap-3 p-3 sm:p-5">
        <Link
          href="/milo-world/quiz-hall"
          className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-cyan-200/25 bg-[#040e1f]/80 px-4 text-[10px] font-black uppercase tracking-[0.1em] text-white no-underline backdrop-blur-xl sm:px-5 sm:text-xs"
        >
          ← Quiz Hall
        </Link>

        <span className="rounded-full border border-amber-200/20 bg-amber-300/[0.07] px-4 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-amber-100">
          Staging Preview
        </span>
      </header>

      <section className="relative z-10 mx-auto flex h-[calc(100dvh-74px)] w-full max-w-[1180px] min-h-0 flex-col px-4 pb-5 sm:px-6">
        <div className="shrink-0 pt-3 sm:pt-7">
          <p className="m-0 text-[10px] font-black uppercase tracking-[0.22em] text-[#ffd18a]">
            Milo’s Quiz Hall
          </p>
          <h1 className="mt-2 font-serif text-[clamp(38px,6vw,72px)] font-normal leading-[0.95]">
            Creator Clubs
          </h1>
          <p className="mt-4 max-w-[760px] text-sm leading-6 text-white/60 sm:text-base sm:leading-7">
            This is the staging entrance for creator-led communities. The
            community, creator publishing and marketplace systems will connect
            here in the next build.
          </p>
        </div>

        <div className="mt-5 grid min-h-0 flex-1 gap-3 md:grid-cols-3">
          {shellCards.map((card) => (
            <article
              key={card.title}
              className="flex min-h-0 flex-col justify-between overflow-hidden rounded-[24px] border border-white/12 bg-white/[0.055] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-6"
            >
              <div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-[13px] border border-amber-200/25 bg-amber-300/[0.08] text-xl text-[#ffd18a]">
                  {card.icon}
                </span>
                <h2 className="mt-5 text-xl font-black sm:text-2xl">
                  {card.title}
                </h2>
                <p className="mt-3 text-xs leading-5 text-white/52 sm:text-sm sm:leading-6">
                  {card.description}
                </p>
              </div>

              <span className="mt-5 w-fit rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-white/42">
                Coming next
              </span>
            </article>
          ))}
        </div>

        <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-[18px] border border-cyan-200/14 bg-cyan-300/[0.045] px-4 py-3 sm:px-5">
          <p className="m-0 text-xs leading-5 text-white/48 sm:text-sm">
            For now, Dreamscape’s existing official quiz experience remains
            fully available through the Categories Hub.
          </p>
          <Link
            href="/milo-world/categories"
            className="rounded-full border border-cyan-200/24 bg-cyan-300/[0.09] px-4 py-2 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100 no-underline"
          >
            Enter Categories →
          </Link>
        </div>
      </section>
    </main>
  );
}
