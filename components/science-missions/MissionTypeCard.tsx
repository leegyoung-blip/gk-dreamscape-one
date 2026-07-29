import type { MissionType } from "@/data/science-missions";

export function MissionTypeCard({
  mission,
  count,
}: {
  mission: MissionType;
  count: number;
}) {
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-black/20 text-xl">
          {mission.icon}
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-black text-cyan-100">
          {count} quizzes
        </span>
      </div>
      <h3 className="mt-4 text-lg font-black text-white">{mission.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{mission.description}</p>
    </section>
  );
}
