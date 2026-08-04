"use client";

import Link from "next/link";
import { ProgressRing } from "@/components/science-missions/ProgressRing";
import { ScienceHeader } from "@/components/science-missions/ScienceHeader";
import { ScienceShell } from "@/components/science-missions/ScienceShell";
import {
  MISSION_TYPES,
  SCIENCE_LEVELS,
} from "@/data/science-missions";
import { useScienceMissionAccess } from "@/hooks/useScienceMissionAccess";

export default function ScienceMissionsClient() {
  const { status } = useScienceMissionAccess();

  const totalQuizzes = SCIENCE_LEVELS.reduce(
    (sum, level) => sum + level.quizCount,
    0,
  );

  if (status === "checking") {
    return (
      <ScienceShell>
        <ScienceHeader />
        <StatusPanel text="Checking Science Missions access…" />
      </ScienceShell>
    );
  }

  if (status === "signed_out") {
    return (
      <ScienceShell>
        <ScienceHeader />

        <AccessPanel
          eyebrow="Account required"
          title="Log in to enter Science Missions"
          text="Use your Dreamscape account to load your Science access, progress and rewards."
          primaryHref="/login?next=/learning-missions/science"
          primaryLabel="Log In"
        />
      </ScienceShell>
    );
  }

  if (status === "profile_required") {
    return (
      <ScienceShell>
        <ScienceHeader />

        <AccessPanel
          eyebrow="Learner profile required"
          title="Complete Your Learner Profile"
          text="Enter the learner's date of birth so Nova can provide age-appropriate analysis and recommendations before Science Missions opens."
          primaryHref="/complete-profile?next=%2Flearning-missions%2Fscience"
          primaryLabel="Complete Profile"
          secondaryHref="/learning-missions"
          secondaryLabel="Return to Missions"
        />
      </ScienceShell>
    );
  }

  if (status === "locked") {
    return (
      <ScienceShell>
        <ScienceHeader />

        <AccessPanel
          eyebrow="Science access"
          title="Science Missions Locked"
          text="This account does not currently have Science Missions access."
          primaryHref="/nova/membership-portal"
          primaryLabel="View Access Plans"
          secondaryHref="/learning-missions"
          secondaryLabel="Return to Missions"
          tone="amber"
        />
      </ScienceShell>
    );
  }

  return (
    <ScienceShell>
      <ScienceHeader />

      <section className="overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl sm:p-8 lg:p-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
              Primary 1 to Primary 6
            </div>

            <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Science Missions
            </h1>

            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
              Explore, investigate and master Science through visual missions,
              experiments, evidence and real-world challenges.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <div className="text-3xl font-black text-white">6</div>
              <div className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Levels
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <div className="text-3xl font-black text-white">
                {totalQuizzes.toLocaleString("en-US")}
              </div>
              <div className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Quizzes
              </div>
            </div>

            <div className="col-span-2 rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-5">
              <div className="text-sm font-black text-cyan-100">
                Four-part mission structure
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {MISSION_TYPES.map((type) => (
                  <span
                    key={type.id}
                    className="rounded-full bg-black/20 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    {type.icon} {type.shortTitle}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
              Choose your level
            </p>

            <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              Select a Science pathway
            </h2>
          </div>

          <p className="max-w-xl text-sm leading-6 text-slate-400">
            P1 and P2 build discovery skills. P3 to P6 develop formal Primary
            Science knowledge, inquiry and application.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {SCIENCE_LEVELS.map((level) => {
            const progress = 0;

            return (
              <Link
                key={level.id}
                href={`/learning-missions/science/${level.id}`}
                className={`group relative flex min-h-[290px] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.07] p-5 shadow-2xl ${level.theme.glow} backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.1] sm:p-6`}
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${level.theme.from} ${level.theme.via} ${level.theme.to}`}
                />

                <div
                  className={`pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-gradient-to-br ${level.theme.from} ${level.theme.to} opacity-20 blur-2xl transition group-hover:opacity-35`}
                />

                <div className="relative mb-5 flex items-start justify-between gap-4">
                  <div
                    className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${level.theme.from} ${level.theme.to} text-xl font-black text-white shadow-lg`}
                  >
                    P{level.levelNumber}
                  </div>

                  <ProgressRing value={progress} size={68} />
                </div>

                <div className="relative mb-4">
                  <div className="mb-2 inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300">
                    {level.pathway}
                  </div>

                  <h3 className="text-2xl font-black tracking-tight text-white">
                    {level.displayName}
                  </h3>

                  <p className="mt-1 text-sm font-semibold text-cyan-100">
                    {level.subtitle}
                  </p>
                </div>

                <p className="relative mb-6 text-sm leading-6 text-slate-300">
                  {level.description}
                </p>

                <div className="relative mt-auto grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="text-xl font-black text-white">
                      {level.quizCount}
                    </div>

                    <div className="text-xs uppercase tracking-wider text-slate-400">
                      Quizzes
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="text-xl font-black text-white">
                      {level.topics.length}
                    </div>

                    <div className="text-xs uppercase tracking-wider text-slate-400">
                      Topics
                    </div>
                  </div>
                </div>

                <div className="relative mt-4 inline-flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white transition group-hover:bg-white/10">
                  <span>Enter Level</span>

                  <span
                    aria-hidden="true"
                    className="transition group-hover:translate-x-1"
                  >
                    →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </ScienceShell>
  );
}

function StatusPanel({ text }: { text: string }) {
  return (
    <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.05] p-8 text-center text-slate-300 shadow-2xl backdrop-blur-xl">
      {text}
    </div>
  );
}

function AccessPanel({
  eyebrow,
  title,
  text,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  tone = "cyan",
}: {
  eyebrow: string;
  title: string;
  text: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  tone?: "cyan" | "amber";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200/20 bg-amber-300/10"
      : "border-cyan-200/20 bg-[linear-gradient(145deg,rgba(34,211,238,0.13),rgba(124,58,237,0.12))]";

  return (
    <div
      className={`mx-auto mt-12 max-w-2xl rounded-[2rem] border p-8 text-center shadow-2xl backdrop-blur-xl ${toneClass}`}
    >
      <p className="m-0 text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
        {eyebrow}
      </p>

      <h1 className="mt-3 text-3xl font-black text-white">
        {title}
      </h1>

      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
        {text}
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href={primaryHref}
          className="inline-flex min-h-11 items-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-6 text-sm font-black text-white no-underline"
        >
          {primaryLabel}
        </Link>

        {secondaryHref && secondaryLabel && (
          <Link
            href={secondaryHref}
            className="inline-flex min-h-11 items-center rounded-full border border-white/15 bg-white/[0.05] px-6 text-sm font-black text-white no-underline"
          >
            {secondaryLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
