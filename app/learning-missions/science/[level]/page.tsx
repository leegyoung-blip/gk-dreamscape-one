import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProgressRing } from "@/components/science-missions/ProgressRing";
import { ScienceHeader } from "@/components/science-missions/ScienceHeader";
import { ScienceShell } from "@/components/science-missions/ScienceShell";
import { TopicCard } from "@/components/science-missions/TopicCard";
import { MISSION_TYPES, SCIENCE_LEVELS, getScienceLevel } from "@/data/science-missions";

type LevelPageProps = {
  params: Promise<{ level: string }>;
};

export function generateStaticParams() {
  return SCIENCE_LEVELS.map((level) => ({ level: level.id }));
}

export async function generateMetadata({ params }: LevelPageProps): Promise<Metadata> {
  const { level: levelId } = await params;
  const level = getScienceLevel(levelId);

  if (!level) return {};

  return {
    title: `${level.schoolLevel} ${level.displayName} | Science Missions`,
    description: level.description,
  };
}

export default async function ScienceLevelPage({ params }: LevelPageProps) {
  const { level: levelId } = await params;
  const level = getScienceLevel(levelId);

  if (!level) notFound();

  const completedQuizzes = 0;
  const progress = Math.round((completedQuizzes / level.quizCount) * 100);

  return (
    <ScienceShell>
      <ScienceHeader backHref="/science-missions" backLabel="All Science Levels" />

      <section className="overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/[0.06] shadow-2xl backdrop-blur-xl">
        <div className={`h-2 bg-gradient-to-r ${level.theme.from} ${level.theme.via} ${level.theme.to}`} />
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:p-10">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-300">
                {level.schoolLevel}
              </span>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
                {level.pathway}
              </span>
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl">
              {level.displayName}
            </h1>
            <p className="mt-2 text-lg font-bold text-cyan-100">{level.subtitle}</p>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">{level.description}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="text-xl font-black text-white">{level.topics.length}</div>
                <div className="text-xs uppercase tracking-wider text-slate-400">Topics</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="text-xl font-black text-white">{level.quizCount}</div>
                <div className="text-xs uppercase tracking-wider text-slate-400">Total quizzes</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="text-xl font-black text-white">{completedQuizzes}</div>
                <div className="text-xs uppercase tracking-wider text-slate-400">Completed</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-[2rem] border border-white/10 bg-black/20 p-5 lg:block lg:text-center">
            <ProgressRing value={progress} size={104} label="Level" />
            <div className="lg:mt-3">
              <div className="text-sm font-black text-white">Level progress</div>
              <div className="mt-1 text-xs text-slate-400">Complete topics to unlock mastery milestones.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MISSION_TYPES.map((mission) => (
          <div key={mission.id} className="rounded-3xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur">
            <div className="text-2xl">{mission.icon}</div>
            <div className="mt-3 text-sm font-black text-white">{mission.title}</div>
            <div className="mt-1 text-xs leading-5 text-slate-400">{mission.description}</div>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Mission map</p>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Choose a topic</h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {level.topics.map((topic, index) => (
            <TopicCard key={topic.slug} level={level} topic={topic} index={index} />
          ))}
        </div>
      </section>
    </ScienceShell>
  );
}
