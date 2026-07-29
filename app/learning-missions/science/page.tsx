import type { Metadata } from "next";
import { LevelCard } from "@/components/science-missions/LevelCard";
import { ScienceHeader } from "@/components/science-missions/ScienceHeader";
import { ScienceShell } from "@/components/science-missions/ScienceShell";
import { MISSION_TYPES, SCIENCE_LEVELS } from "@/data/science-missions";

export const metadata: Metadata = {
  title: "Science Missions | Dreamscape One",
  description: "Explore Primary 1 to Primary 6 Science Missions.",
};

export default function ScienceMissionsPage() {
  const totalQuizzes = SCIENCE_LEVELS.reduce((sum, level) => sum + level.quizCount, 0);

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
              Explore, investigate and master Science through visual missions, experiments,
              evidence and real-world challenges.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <div className="text-3xl font-black text-white">6</div>
              <div className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Levels</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <div className="text-3xl font-black text-white">{totalQuizzes.toLocaleString("en-US")}</div>
              <div className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Quizzes</div>
            </div>
            <div className="col-span-2 rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-5">
              <div className="text-sm font-black text-cyan-100">Four-part mission structure</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {MISSION_TYPES.map((type) => (
                  <span key={type.id} className="rounded-full bg-black/20 px-3 py-1.5 text-xs font-bold text-white">
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
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Choose your level</p>
            <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Select a Science pathway</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-400">
            P1 and P2 build discovery skills. P3 to P6 develop formal Primary Science knowledge,
            inquiry and application.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {SCIENCE_LEVELS.map((level) => (
            <LevelCard key={level.id} level={level} />
          ))}
        </div>
      </section>
    </ScienceShell>
  );
}
