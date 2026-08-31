"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CoreMissionPageShell from "@/components/core-missions/CoreMissionPageShell";
import CoreMissionTopBar from "@/components/core-missions/CoreMissionTopBar";
import {
  CORE_LEVEL_COPY,
  CORE_SUBJECT_THEMES,
  type CoreSubject,
  type PrimaryLevel,
} from "@/lib/core-missions/catalogue";
import { useCoreMissionAccess } from "@/hooks/useCoreMissionAccess";
import { supabase } from "@/lib/supabase";

type LevelSummary = {
  level: PrimaryLevel;
  planned: number;
  published: number;
  completed: number;
};

type LevelOverviewRow = {
  level: number;
  planned: number;
  published: number;
  completed: number;
};

const LEVELS: PrimaryLevel[] = [1, 2, 3, 4, 5, 6];

function emptySummaries(): LevelSummary[] {
  return LEVELS.map((level) => ({
    level,
    planned: 0,
    published: 0,
    completed: 0,
  }));
}

export default function CoreMissionsPage() {
  const router = useRouter();
  const { status } = useCoreMissionAccess();

  const [subject, setSubject] = useState<CoreSubject>("english");
  const [summaries, setSummaries] = useState<LevelSummary[]>(
    emptySummaries(),
  );
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const theme = CORE_SUBJECT_THEMES[subject];

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const requestedSubject = query.get("subject");

    if (requestedSubject === "english" || requestedSubject === "math") {
      setSubject(requestedSubject);
    }
  }, []);

  useEffect(() => {
    if (status !== "allowed") return;

    let cancelled = false;

    async function loadCatalogue() {
      setLoading(true);
      setMessage("");

      const { data, error } = await supabase.rpc(
        "get_core_levels_overview",
        {
          p_subject: subject,
        },
      );

      if (cancelled) return;

      if (error) {
        setMessage(error.message);
        setSummaries(emptySummaries());
        setLoading(false);
        return;
      }

      const byLevel = new Map<number, LevelOverviewRow>(
        ((data || []) as LevelOverviewRow[]).map((row) => [
          Number(row.level),
          row,
        ]),
      );

      setSummaries(
        LEVELS.map((level) => {
          const row = byLevel.get(level);

          return {
            level,
            planned: Number(row?.planned || 0),
            published: Number(row?.published || 0),
            completed: Number(row?.completed || 0),
          };
        }),
      );

      setLoading(false);
    }

    void loadCatalogue();

    return () => {
      cancelled = true;
    };
  }, [status, subject]);

  const totals = useMemo(
    () =>
      summaries.reduce(
        (total, summary) => ({
          planned: total.planned + summary.planned,
          published: total.published + summary.published,
          completed: total.completed + summary.completed,
        }),
        { planned: 0, published: 0, completed: 0 },
      ),
    [summaries],
  );

  const totalProgress =
    totals.published > 0
      ? Math.round((totals.completed / totals.published) * 100)
      : 0;

  function chooseSubject(nextSubject: CoreSubject) {
    setSubject(nextSubject);
    window.history.replaceState(
      null,
      "",
      `/learning-missions/core?subject=${nextSubject}`,
    );
  }

  if (status === "checking") {
    return (
      <CoreMissionPageShell>
        <CoreMissionTopBar
          backHref="/learning-missions"
          backLabel="Missions"
        />
        <StatusPanel text="Checking Core Missions access…" />
      </CoreMissionPageShell>
    );
  }

  if (status === "signed_out") {
    return (
      <CoreMissionPageShell>
        <CoreMissionTopBar
          backHref="/learning-missions"
          backLabel="Missions"
        />
        <SignedOutPanel />
      </CoreMissionPageShell>
    );
  }

  if (status === "profile_required") {
    return (
      <CoreMissionPageShell>
        <CoreMissionTopBar
          backHref="/learning-missions"
          backLabel="Missions"
        />
        <ProfileRequiredPanel />
      </CoreMissionPageShell>
    );
  }

  if (status === "locked") {
    return (
      <CoreMissionPageShell>
        <CoreMissionTopBar
          backHref="/learning-missions"
          backLabel="Missions"
        />
        <LockedPanel />
      </CoreMissionPageShell>
    );
  }

  return (
    <CoreMissionPageShell>
      <CoreMissionTopBar
        backHref="/learning-missions"
        backLabel="Missions"
      />

      <section
        className={[
          "mt-7 overflow-hidden rounded-[2.25rem] border bg-white/[0.055] shadow-[0_30px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl",
          theme.borderClass,
        ].join(" ")}
      >
        <div className={`h-2 ${theme.barClass}`} />

        <div className="grid gap-7 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:p-10">
          <div>
            <p
              className={[
                "m-0 text-xs font-black uppercase tracking-[0.2em]",
                theme.eyebrowClass,
              ].join(" ")}
            >
              Core Missions · English and Mathematics
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
              {theme.name} Levels
            </h1>

            <p className="mt-4 max-w-3xl text-base leading-7 text-white/65 sm:text-lg">
              {theme.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {(
                [
                  ["english", "Aa", "English"],
                  ["math", "∑", "Mathematics"],
                ] as const
              ).map(([id, icon, label]) => {
                const active = subject === id;

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => chooseSubject(id)}
                    className={[
                      "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-xs font-black transition",
                      active
                        ? `${CORE_SUBJECT_THEMES[id].borderClass} ${CORE_SUBJECT_THEMES[id].softClass} ${CORE_SUBJECT_THEMES[id].textClass}`
                        : "border-white/10 bg-white/[0.04] text-white/55 hover:border-white/20 hover:text-white/80",
                    ].join(" ")}
                  >
                    <span>{icon}</span>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <Metric label="Published" value={String(totals.published)} />
            <Metric label="Completed" value={String(totals.completed)} />
            <Metric label="Progress" value={`${totalProgress}%`} />
          </div>
        </div>
      </section>

      {loading ? (
        <StatusPanel text={`Loading ${theme.name} levels…`} />
      ) : message ? (
        <MessagePanel text={message} />
      ) : (
        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="m-0 text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
                Primary Levels
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.035em]">
                Choose a {theme.name} level
              </h2>
            </div>

            <p className="m-0 max-w-xl text-sm leading-6 text-white/50">
              Each level contains curriculum topics, published missions and
              your completion progress.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {summaries.map((summary) => {
              const progress =
                summary.published > 0
                  ? Math.round(
                      (summary.completed / summary.published) * 100,
                    )
                  : 0;
              const copy = CORE_LEVEL_COPY[summary.level];

              return (
                <button
                  key={summary.level}
                  type="button"
                  onClick={() =>
                    router.push(
                      `/learning-missions/core/${subject}/p${summary.level}`,
                    )
                  }
                  className={[
                    "group rounded-[1.75rem] border border-white/10 p-5 text-left text-white shadow-[0_20px_58px_rgba(0,0,0,0.22)] transition hover:-translate-y-1",
                    theme.cardBackground,
                    subject === "english"
                      ? "hover:border-violet-200/30"
                      : "hover:border-emerald-200/30",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={[
                        "grid h-14 w-14 place-items-center rounded-2xl border text-xl font-black",
                        theme.borderClass,
                        theme.softClass,
                        theme.textClass,
                      ].join(" ")}
                    >
                      P{summary.level}
                    </div>

                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/55">
                      {summary.planned || 250} planned
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-black tracking-[-0.025em]">
                    {copy.title}
                  </h3>

                  <p className="mt-2 min-h-[66px] text-sm leading-6 text-white/55">
                    {copy.subtitle}
                  </p>

                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/45">
                        {summary.published} published · {summary.completed}{" "}
                        completed
                      </span>
                      <strong className={theme.eyebrowClass}>
                        {progress}%
                      </strong>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className={`h-full rounded-full ${theme.progressClass}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 text-sm font-extrabold text-cyan-200">
                    Open level →
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </CoreMissionPageShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <strong className="block text-2xl font-black">{value}</strong>
      <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.13em] text-white/40">
        {label}
      </span>
    </div>
  );
}

function StatusPanel({ text }: { text: string }) {
  return (
    <div className="mt-7 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/55">
      {text}
    </div>
  );
}

function MessagePanel({ text }: { text: string }) {
  return (
    <div className="mt-7 rounded-3xl border border-amber-200/25 bg-amber-300/10 p-6 text-amber-100">
      {text}
    </div>
  );
}

function SignedOutPanel() {
  return (
    <div className="mx-auto mt-16 max-w-2xl rounded-[2rem] border border-cyan-200/20 bg-cyan-300/10 p-8 text-center">
      <p className="m-0 text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
        Account required
      </p>

      <h1 className="mt-3 text-3xl font-black">
        Log in to enter Core Missions
      </h1>

      <p className="mt-3 text-white/65">
        Use your Dreamscape account to load your access, progress and rewards.
      </p>

      <a
        href="/login?next=/learning-missions/core"
        className="mt-6 inline-flex min-h-11 items-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-6 text-sm font-black text-white no-underline"
      >
        Log In
      </a>
    </div>
  );
}

function ProfileRequiredPanel() {
  return (
    <div className="mx-auto mt-16 max-w-2xl rounded-[2rem] border border-cyan-200/20 bg-[linear-gradient(145deg,rgba(34,211,238,0.13),rgba(124,58,237,0.12))] p-8 text-center">
      <p className="m-0 text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
        Learner profile required
      </p>

      <h1 className="mt-3 text-3xl font-black">
        Complete Your Learner Profile
      </h1>

      <p className="mx-auto mt-3 max-w-xl text-white/65">
        Enter the learner&apos;s date of birth so Nova can provide
        age-appropriate analysis and recommendations before Core Missions
        opens.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <a
          href="/complete-profile?next=%2Flearning-missions%2Fcore"
          className="inline-flex min-h-11 items-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-6 text-sm font-black text-white no-underline"
        >
          Complete Profile
        </a>

        <a
          href="/learning-missions"
          className="inline-flex min-h-11 items-center rounded-full border border-white/15 bg-white/[0.05] px-6 text-sm font-black text-white no-underline"
        >
          Return to Missions
        </a>
      </div>
    </div>
  );
}

function LockedPanel() {
  return (
    <div className="mx-auto mt-16 max-w-2xl rounded-[2rem] border border-amber-200/20 bg-amber-300/10 p-8 text-center">
      <h1 className="m-0 text-3xl font-black">Core Missions Locked</h1>

      <p className="mt-3 text-white/65">
        This account does not currently have Core Missions access.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <a
          href="/nova/membership-portal"
          className="inline-flex min-h-11 items-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-6 text-sm font-black text-white no-underline"
        >
          View Access Plans
        </a>

        <a
          href="/learning-missions"
          className="inline-flex min-h-11 items-center rounded-full border border-white/15 bg-white/[0.05] px-6 text-sm font-black text-white no-underline"
        >
          Return to Missions
        </a>
      </div>
    </div>
  );
}
