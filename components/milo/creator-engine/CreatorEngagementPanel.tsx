"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type TrendPoint = {
  day: string;
  plays: number;
};

type QuestionTypeStat = {
  question_type: string;
  answers: number;
  average_credit: number;
};

type AnalyticsPayload = {
  unique_players: number;
  returning_players: number;
  repeat_rate: number;
  total_attempts: number;
  started_sessions: number;
  completed_sessions: number;
  completion_rate: number;
  average_score: number;
  plays_last_7_days: number;
  plays_previous_7_days: number;
  member_growth_7_days: number;

  rooms_created: number;
  room_players: number;
  room_rounds_completed: number;

  best_challenge: {
    quiz_id: string;
    title: string;
    plays: number;
    average_score: number;
  } | null;

  question_types: QuestionTypeStat[];

  reactions: {
    fun: number;
    tricky: number;
    learned: number;
    great: number;
    more_like_this: number;
  };

  weekly_trend: TrendPoint[];
};

const EMPTY: AnalyticsPayload = {
  unique_players: 0,
  returning_players: 0,
  repeat_rate: 0,
  total_attempts: 0,
  started_sessions: 0,
  completed_sessions: 0,
  completion_rate: 0,
  average_score: 0,
  plays_last_7_days: 0,
  plays_previous_7_days: 0,
  member_growth_7_days: 0,
  rooms_created: 0,
  room_players: 0,
  room_rounds_completed: 0,
  best_challenge: null,
  question_types: [],
  reactions: {
    fun: 0,
    tricky: 0,
    learned: 0,
    great: 0,
    more_like_this: 0,
  },
  weekly_trend: [],
};

function normalize(raw: Record<string, unknown>): AnalyticsPayload {
  const best =
    raw.best_challenge && typeof raw.best_challenge === "object"
      ? (raw.best_challenge as Record<string, unknown>)
      : null;

  return {
    unique_players: Number(raw.unique_players || 0),
    returning_players: Number(raw.returning_players || 0),
    repeat_rate: Number(raw.repeat_rate || 0),
    total_attempts: Number(raw.total_attempts || 0),
    started_sessions: Number(raw.started_sessions || 0),
    completed_sessions: Number(raw.completed_sessions || 0),
    completion_rate: Number(raw.completion_rate || 0),
    average_score: Number(raw.average_score || 0),
    plays_last_7_days: Number(raw.plays_last_7_days || 0),
    plays_previous_7_days: Number(raw.plays_previous_7_days || 0),
    member_growth_7_days: Number(raw.member_growth_7_days || 0),

    rooms_created: Number(raw.rooms_created || 0),
    room_players: Number(raw.room_players || 0),
    room_rounds_completed: Number(raw.room_rounds_completed || 0),

    best_challenge: best
      ? {
          quiz_id: String(best.quiz_id || ""),
          title: String(best.title || "Creator Challenge"),
          plays: Number(best.plays || 0),
          average_score: Number(best.average_score || 0),
        }
      : null,

    question_types: ((raw.question_types || []) as unknown[]).map((item) => {
      const value = item as Record<string, unknown>;
      return {
        question_type: String(value.question_type || ""),
        answers: Number(value.answers || 0),
        average_credit: Number(value.average_credit || 0),
      };
    }),

    reactions: {
      fun: Number(
        (raw.reactions as Record<string, unknown> | undefined)?.fun || 0,
      ),
      tricky: Number(
        (raw.reactions as Record<string, unknown> | undefined)?.tricky || 0,
      ),
      learned: Number(
        (raw.reactions as Record<string, unknown> | undefined)?.learned || 0,
      ),
      great: Number(
        (raw.reactions as Record<string, unknown> | undefined)?.great || 0,
      ),
      more_like_this: Number(
        (raw.reactions as Record<string, unknown> | undefined)
          ?.more_like_this || 0,
      ),
    },

    weekly_trend: ((raw.weekly_trend || []) as unknown[]).map((item) => {
      const value = item as Record<string, unknown>;
      return {
        day: String(value.day || ""),
        plays: Number(value.plays || 0),
      };
    }),
  };
}

function typeLabel(value: string) {
  switch (value) {
    case "classic_choice":
      return "Classic Choice";
    case "choice_grid":
      return "Choice Grid";
    case "bar_estimate":
      return "Bar Estimate";
    case "pie_estimate":
      return "Pie Estimate";
    default:
      return value || "Question Type";
  }
}

export default function CreatorEngagementPanel() {
  const [analytics, setAnalytics] = useState<AnalyticsPayload>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "creator_get_engagement_analytics_v2",
    );

    if (error) {
      setAnalytics(EMPTY);
      setErrorMessage(
        error.message || "Creator engagement analytics could not be loaded.",
      );
      setIsLoading(false);
      return;
    }

    setAnalytics(
      data ? normalize(data as Record<string, unknown>) : EMPTY,
    );
    setIsLoading(false);
  }

  const maxTrend = useMemo(
    () =>
      Math.max(
        1,
        ...analytics.weekly_trend.map((point) => Number(point.plays || 0)),
      ),
    [analytics.weekly_trend],
  );

  const reactionTotal =
    analytics.reactions.fun +
    analytics.reactions.tricky +
    analytics.reactions.learned +
    analytics.reactions.great +
    analytics.reactions.more_like_this;

  const playDelta =
    analytics.plays_last_7_days - analytics.plays_previous_7_days;

  if (isLoading) {
    return (
      <section className="shrink-0 rounded-[26px] border border-cyan-200/12 bg-cyan-300/[0.035] p-5 text-xs text-white/40">
        Loading Creator Engagement...
      </section>
    );
  }

  return (
    <section className="shrink-0 rounded-[28px] border border-cyan-200/12 bg-[linear-gradient(145deg,rgba(11,62,84,0.14),rgba(3,13,29,0.92))] p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/58">
            Creator Engagement
          </p>
          <h2 className="mt-1 text-2xl font-black">
            See what makes members come back.
          </h2>
          <p className="mt-2 max-w-3xl text-[10px] leading-5 text-white/36">
            These signals are separate from Creator Rewards. Play Room usage is
            shown here, but internal rooms do not inflate Creator Reputation or
            creator DT.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className="min-h-9 w-fit rounded-full border border-cyan-200/16 bg-cyan-300/[0.05] px-4 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-100"
        >
          Refresh Analytics
        </button>
      </div>

      {errorMessage && (
        <p className="mt-3 rounded-xl border border-red-200/12 bg-red-400/[0.05] px-3 py-2 text-[9px] text-red-100">
          {errorMessage}
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="Unique Players"
          value={analytics.unique_players.toLocaleString()}
        />
        <Metric
          label="Returning Players"
          value={analytics.returning_players.toLocaleString()}
          secondary={`${Math.round(analytics.repeat_rate * 100)}% repeat rate`}
        />
        <Metric
          label="Completion Rate"
          value={`${Math.round(analytics.completion_rate * 100)}%`}
          secondary={`${analytics.completed_sessions}/${analytics.started_sessions} sessions`}
        />
        <Metric
          label="Average Score"
          value={`${Math.round(analytics.average_score)}%`}
        />
        <Metric
          label="7-Day Plays"
          value={analytics.plays_last_7_days.toLocaleString()}
          secondary={`${playDelta >= 0 ? "+" : ""}${playDelta} vs prior 7 days`}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(330px,0.8fr)]">
        <section className="rounded-[22px] border border-white/8 bg-black/14 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/28">
                Last 7 Days
              </p>
              <h3 className="mt-1 text-lg font-black">
                Challenge activity
              </h3>
            </div>
            <strong className="text-lg text-cyan-100">
              +{analytics.member_growth_7_days} members
            </strong>
          </div>

          <div className="mt-5 flex h-[150px] items-end gap-2">
            {analytics.weekly_trend.length === 0 ? (
              <p className="text-[10px] text-white/28">
                Weekly activity will appear after members begin playing.
              </p>
            ) : (
              analytics.weekly_trend.map((point) => {
                const height = Math.max(
                  8,
                  (point.plays / maxTrend) * 100,
                );

                return (
                  <div
                    key={point.day}
                    className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                  >
                    <strong className="text-[8px] text-white/38">
                      {point.plays}
                    </strong>
                    <div className="flex h-[105px] w-full items-end overflow-hidden rounded-lg bg-white/[0.035]">
                      <div
                        className="w-full rounded-lg bg-cyan-200/55"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <span className="truncate text-[7px] text-white/24">
                      {new Date(`${point.day}T00:00:00`).toLocaleDateString(
                        "en-SG",
                        {
                          weekday: "short",
                          timeZone: "Asia/Singapore",
                        },
                      )}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-[22px] border border-violet-200/10 bg-violet-300/[0.025] p-4">
          <p className="text-[8px] font-black uppercase tracking-[0.12em] text-violet-100/52">
            Best Challenge
          </p>

          {analytics.best_challenge ? (
            <>
              <h3 className="mt-2 text-lg font-black">
                {analytics.best_challenge.title}
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <MiniMetric
                  label="Plays"
                  value={analytics.best_challenge.plays}
                />
                <MiniMetric
                  label="Average"
                  value={`${Math.round(
                    analytics.best_challenge.average_score,
                  )}%`}
                />
              </div>
            </>
          ) : (
            <p className="mt-3 text-[10px] leading-5 text-white/30">
              Publish and play Engine V2 challenges to build this view.
            </p>
          )}

          <div className="mt-5 border-t border-white/8 pt-4">
            <p className="text-[8px] font-black uppercase tracking-[0.1em] text-white/26">
              Club Play Rooms
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <MiniMetric label="Rooms" value={analytics.rooms_created} />
              <MiniMetric label="Players" value={analytics.room_players} />
              <MiniMetric
                label="Rounds"
                value={analytics.room_rounds_completed}
              />
            </div>
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <section className="rounded-[22px] border border-amber-200/10 bg-amber-300/[0.025] p-4">
          <p className="text-[8px] font-black uppercase tracking-[0.12em] text-amber-100/54">
            Question-Type Performance
          </p>

          {analytics.question_types.length === 0 ? (
            <p className="mt-3 text-[10px] text-white/28">
              No question-type data yet.
            </p>
          ) : (
            <div className="mt-3 grid gap-2">
              {analytics.question_types.map((item) => (
                <div
                  key={item.question_type}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-white/7 bg-black/12 px-3 py-3"
                >
                  <span className="min-w-0">
                    <strong className="block truncate text-[10px]">
                      {typeLabel(item.question_type)}
                    </strong>
                    <small className="mt-1 block text-[8px] text-white/26">
                      {item.answers.toLocaleString()} answers
                    </small>
                  </span>
                  <strong className="text-sm text-amber-100">
                    {Math.round(item.average_credit * 100)}%
                  </strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[22px] border border-fuchsia-200/10 bg-fuchsia-300/[0.025] p-4">
          <p className="text-[8px] font-black uppercase tracking-[0.12em] text-fuchsia-100/54">
            Safe Reactions
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <ReactionStat label="Fun" value={analytics.reactions.fun} />
            <ReactionStat label="Tricky" value={analytics.reactions.tricky} />
            <ReactionStat
              label="Learned"
              value={analytics.reactions.learned}
            />
            <ReactionStat label="Great" value={analytics.reactions.great} />
            <ReactionStat
              label="More"
              value={analytics.reactions.more_like_this}
            />
          </div>
          <p className="mt-3 text-[8px] text-white/24">
            {reactionTotal.toLocaleString()} total safe reactions. Open
            comments/chat remain disabled.
          </p>
        </section>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string;
  secondary?: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/8 bg-black/14 px-4 py-4">
      <strong className="block text-xl text-cyan-100">{value}</strong>
      <span className="mt-1 block text-[7px] font-black uppercase tracking-[0.08em] text-white/26">
        {label}
      </span>
      {secondary && (
        <small className="mt-2 block text-[8px] text-white/24">
          {secondary}
        </small>
      )}
    </div>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-white/7 bg-black/12 px-3 py-3 text-center">
      <strong className="block text-sm text-violet-100">
        {typeof value === "number" ? value.toLocaleString() : value}
      </strong>
      <span className="mt-1 block text-[6px] font-black uppercase tracking-[0.07em] text-white/24">
        {label}
      </span>
    </div>
  );
}

function ReactionStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-white/7 bg-black/12 px-2 py-3 text-center">
      <strong className="block text-sm text-fuchsia-100">
        {value.toLocaleString()}
      </strong>
      <span className="mt-1 block text-[6px] font-black uppercase tracking-[0.07em] text-white/24">
        {label}
      </span>
    </div>
  );
}
