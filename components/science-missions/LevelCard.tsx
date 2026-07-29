import Link from "next/link";
import type { ScienceLevel } from "@/data/science-missions";
import { ProgressRing } from "./ProgressRing";

export function LevelCard({ level }: { level: ScienceLevel }) {
  const progress = 0;

  return (
    <Link
      href={`/science-missions/${level.id}`}
      className={`group relative flex min-h-[290px] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.07] p-5 shadow-2xl ${level.theme.glow} backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.1] sm:p-6`}
    >
      <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${level.theme.from} ${level.theme.via} ${level.theme.to}`} />
      <div className={`pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-gradient-to-br ${level.theme.from} ${level.theme.to} opacity-20 blur-2xl transition group-hover:opacity-35`} />

      <div className="mb-5 flex items-start justify-between gap-4">
        <div className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${level.theme.from} ${level.theme.to} text-xl font-black shadow-lg`}>
          P{level.levelNumber}
        </div>
        <ProgressRing value={progress} size={68} />
      </div>

      <div className="mb-4">
        <div className="mb-2 inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300">
          {level.pathway}
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white">{level.displayName}</h2>
        <p className="mt-1 text-sm font-semibold text-cyan-100">{level.subtitle}</p>
      </div>

      <p className="mb-6 text-sm leading-6 text-slate-300">{level.description}</p>

      <div className="mt-auto grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="text-xl font-black text-white">{level.quizCount}</div>
          <div className="text-xs uppercase tracking-wider text-slate-400">Quizzes</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="text-xl font-black text-white">{level.topics.length}</div>
          <div className="text-xs uppercase tracking-wider text-slate-400">Topics</div>
        </div>
      </div>

      <div className="mt-4 inline-flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white transition group-hover:bg-white/10">
        <span>Enter Level</span>
        <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span>
      </div>
    </Link>
  );
}
