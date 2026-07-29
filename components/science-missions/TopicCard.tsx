import Link from "next/link";
import type { ScienceLevel, ScienceTopic } from "@/data/science-missions";

export function TopicCard({
  level,
  topic,
  index,
}: {
  level: ScienceLevel;
  topic: ScienceTopic;
  index: number;
}) {
  const completed = 0;
  const progress = Math.round((completed / topic.quizCount) * 100);

  return (
    <article className="group flex h-full flex-col rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-white/[0.09]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-black/20 text-2xl">
            {topic.icon}
          </div>
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">
              Topic {String(index + 1).padStart(2, "0")}
            </div>
            <div className="mt-1 text-sm font-bold text-slate-400">{topic.quizCount} quizzes</div>
          </div>
        </div>
        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-bold text-slate-300">
          {completed}/{topic.quizCount}
        </div>
      </div>

      <h2 className="text-xl font-black tracking-tight text-white">{topic.title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">{topic.summary}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {topic.learningAreas.slice(0, 4).map((area) => (
          <span
            key={area}
            className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-slate-300"
          >
            {area}
          </span>
        ))}
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-400">
          <span>Topic progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className={`h-full rounded-full bg-gradient-to-r ${level.theme.from} ${level.theme.to}`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      <Link
        href={`/science-missions/${level.id}/${topic.slug}`}
        className="mt-5 inline-flex min-h-11 items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-black text-white transition hover:border-cyan-300/30 hover:bg-cyan-300/10"
      >
        <span>Open Topic</span>
        <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
