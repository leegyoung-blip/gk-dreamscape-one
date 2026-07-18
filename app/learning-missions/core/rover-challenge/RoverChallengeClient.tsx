"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const PhaserGame = dynamic(
  () => import("./PhaserGame"),
  {
    ssr: false,

    loading: () => (
      <div className="flex min-h-[500px] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />

          <p className="text-sm font-medium tracking-[0.18em] text-white/60">
            PREPARING ROVER CHALLENGE
          </p>
        </div>
      </div>
    ),
  },
);

export default function RoverChallengeClient() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050713] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 10%, rgba(85, 73, 255, 0.18), transparent 35%), radial-gradient(circle at 85% 70%, rgba(0, 213, 255, 0.1), transparent 30%)",
        }}
      />

      <header className="relative z-20 flex items-center justify-between px-5 py-4 sm:px-8">
        <Link
          href="/learning-missions"
          className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white/75 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          ← Learning Missions
        </Link>

        <div className="hidden text-right sm:block">
          <p className="text-xs tracking-[0.24em] text-cyan-300/70">
            CORE MISSIONS
          </p>

          <p className="mt-1 text-sm font-semibold text-white/90">
            Skyforge Rover Programme
          </p>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col px-4 pb-8 sm:px-8">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.28em] text-cyan-300">
              TEST COURSE 01
            </p>

            <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
              Rover Challenge
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">
              Drive, jump and boost through the Skyforge
              calibration course. Reach the finish gate and
              collect as many energy orbs as possible.
            </p>
          </div>

          <div className="mt-3 flex items-center gap-2 sm:mt-0">
            <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">
              SYSTEM ONLINE
            </div>

            <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white/55">
              Test Build
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-black/30 shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />

          <PhaserGame />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <InfoCard
            label="Course"
            value="Skyforge Test Track"
          />

          <InfoCard
            label="Rover"
            value="Detailed Rover Prototype"
          />

          <InfoCard
            label="Current Objective"
            value="Reach the Finish Gate"
          />
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-xl">
          <p className="text-[10px] font-semibold tracking-[0.22em] text-cyan-300/70">
            CONTROLS
          </p>

          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/70">
            <span>
              <strong className="text-white">
                A / D or ← / →
              </strong>{" "}
              Drive
            </span>

            <span>
              <strong className="text-white">
                W or ↑
              </strong>{" "}
              Jump
            </span>

            <span>
              <strong className="text-white">
                Space
              </strong>{" "}
              Boost
            </span>

            <span>
              <strong className="text-white">
                R
              </strong>{" "}
              Restart
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

type InfoCardProps = {
  label: string;
  value: string;
};

function InfoCard({
  label,
  value,
}: InfoCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-xl">
      <p className="text-[10px] font-semibold tracking-[0.22em] text-white/35">
        {label.toUpperCase()}
      </p>

      <p className="mt-1 text-sm font-medium text-white/80">
        {value}
      </p>
    </div>
  );
}
