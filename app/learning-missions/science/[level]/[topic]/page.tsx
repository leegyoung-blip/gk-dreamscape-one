import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MissionTypeCard } from "@/components/science-missions/MissionTypeCard";
import { ScienceHeader } from "@/components/science-missions/ScienceHeader";
import { ScienceShell } from "@/components/science-missions/ScienceShell";
import {
  MISSION_TYPES,
  SCIENCE_LEVELS,
  getScienceLevel,
  getScienceTopic,
  splitMissionCounts,
} from "@/data/science-missions";

type TopicPageProps = {
  params: Promise<{ level: string; topic: string }>;
};

export function generateStaticParams() {
  return SCIENCE_LEVELS.flatMap((level) =>
    level.topics.map((topic) => ({
      level: level.id,
      topic: topic.slug,
    })),
  );
}

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { level: levelId, topic: topicSlug } = await params;
  const level = getScienceLevel(levelId);
  const topic = getScienceTopic(levelId, topicSlug);

  if (!level || !topic) return {};

  return {
    title: `${topic.title} | ${level.schoolLevel} Science Missions`,
    description: topic.summary,
  };
}

export default async function ScienceTopicPage({ params }: TopicPageProps) {
  const { level: levelId, topic: topicSlug } = await params;
  const level = getScienceLevel(levelId);
  const topic = getScienceTopic(levelId, topicSlug);

  if (!level || !topic) notFound();

  const missionCounts = splitMissionCounts(topic.quizCount);

  return (
    <ScienceShell>
      <ScienceHeader
        backHref={`/science-missions/${level.id}`}
        backLabel={`${level.schoolLevel} Topics`}
      />

      <section className="overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/[0.06] shadow-2xl backdrop-blur-xl">
        <div className={`h-2 bg-gradient-to-r ${level.theme.from} ${level.theme.via} ${level.theme.to}`} />
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.16em]">
                <Link href="/science-missions" className="text-slate-400 transition hover:text-white">
                  Science Missions
                </Link>
                <span className="text-slate-600">/</span>
                <Link href={`/science-missions/${level.id}`} className="text-slate-400 transition hover:text-white">
                  {level.schoolLevel}
                </Link>
                <span className="text-slate-600">/</span>
                <span className="text-cyan-200">{topic.title}</span>
              </div>

              <div className="mt-6 flex items-start gap-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl border border-white/10 bg-black/20 text-3xl">
                  {topic.icon}
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">{topic.title}</h1>
                  <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">{topic.summary}</p>
                </div>
              </div>
            </div>

            <div className="grid min-w-[220px] grid-cols-2 gap-3 lg:grid-cols-1">
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <div className="text-2xl font-black text-white">{topic.quizCount}</div>
                <div className="text-xs uppercase tracking-wider text-slate-400">Topic quizzes</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <div className="text-2xl font-black text-white">0%</div>
                <div className="text-xs uppercase tracking-wider text-slate-400">Completed</div>
              </div>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            {topic.learningAreas.map((area) => (
              <span key={area} className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-bold text-slate-300">
                {area}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Topic structure</p>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Four mission categories</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            These counts are generated from the topic total. They can later be replaced with exact quiz records from Supabase.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {MISSION_TYPES.map((mission) => (
            <MissionTypeCard
              key={mission.id}
              mission={mission}
              count={missionCounts[mission.id]}
            />
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-dashed border-white/15 bg-white/[0.04] p-6 backdrop-blur sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Quiz bank placeholder</div>
            <h2 className="mt-2 text-2xl font-black text-white">Quizzes will appear here</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              The page structure is ready for future filters, difficulty levels, progress tracking,
              rewards, quiz cards and Supabase records. No question content is included yet.
            </p>
          </div>

          <button
            type="button"
            disabled
            className="min-h-12 rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-black text-slate-500"
          >
            Start first quiz — coming later
          </button>
        </div>

        <div className="mt-6 grid gap-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/15 p-4">
              <div className="h-10 w-10 animate-pulse rounded-xl bg-white/10" />
              <div className="flex-1">
                <div className="h-3 w-44 animate-pulse rounded-full bg-white/10" />
                <div className="mt-2 h-2.5 w-64 max-w-full animate-pulse rounded-full bg-white/5" />
              </div>
              <div className="hidden h-8 w-24 animate-pulse rounded-xl bg-white/10 sm:block" />
            </div>
          ))}
        </div>
      </section>
    </ScienceShell>
  );
}
