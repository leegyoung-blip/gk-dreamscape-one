"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ReputationRow = {
  creator_partner_id: string;
  creator_slug: string;
  creator_display_name: string;
  reputation_score: number;
  gross_score: number;
  moderation_penalty: number;
  level_key: string;
  level_name: string;
  member_count: number;
  unique_players: number;
  repeat_players: number;
  total_plays: number;
  published_challenges: number;
  active_weeks: number;
  audience_score: number;
  participation_score: number;
  return_score: number;
  consistency_score: number;
  calculated_at: string;
  updated_at: string;
};

type HistoryRow = {
  reputation_score: number;
  reputation_delta: number;
  level_key: string;
  level_name: string;
  metrics: Record<string, number>;
  created_at: string;
};

const LEVELS = [
  { key: "new_creator", name: "New Creator", min: 0 },
  { key: "builder", name: "Builder", min: 150 },
  { key: "rising_creator", name: "Rising Creator", min: 350 },
  { key: "established_creator", name: "Established Creator", min: 600 },
  { key: "leading_creator", name: "Leading Creator", min: 850 },
] as const;

function normalizeRow(row: any): ReputationRow {
  return {
    ...row,
    reputation_score: Number(row?.reputation_score || 0),
    gross_score: Number(row?.gross_score || 0),
    moderation_penalty: Number(row?.moderation_penalty || 0),
    member_count: Number(row?.member_count || 0),
    unique_players: Number(row?.unique_players || 0),
    repeat_players: Number(row?.repeat_players || 0),
    total_plays: Number(row?.total_plays || 0),
    published_challenges: Number(row?.published_challenges || 0),
    active_weeks: Number(row?.active_weeks || 0),
    audience_score: Number(row?.audience_score || 0),
    participation_score: Number(row?.participation_score || 0),
    return_score: Number(row?.return_score || 0),
    consistency_score: Number(row?.consistency_score || 0),
  } as ReputationRow;
}

function nextLevel(score: number) {
  return LEVELS.find((level) => level.min > score) || null;
}

function currentLevelMinimum(score: number) {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (score >= level.min) current = level;
  }
  return current.min;
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

export default function CreatorReputationPanel() {
  const [reputation, setReputation] = useState<ReputationRow | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void refreshReputation(false);
  }, []);

  async function refreshReputation(manual: boolean) {
    if (manual) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "refresh_my_creator_reputation_v1",
    );

    if (error) {
      setErrorMessage(error.message || "Creator Reputation could not be calculated.");
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    setReputation(row ? normalizeRow(row) : null);

    const historyResponse = await supabase.rpc(
      "get_my_creator_reputation_history_v1",
      { p_limit: 8 },
    );

    if (!historyResponse.error) {
      setHistory(
        ((historyResponse.data || []) as HistoryRow[]).map((item) => ({
          ...item,
          reputation_score: Number(item.reputation_score || 0),
          reputation_delta: Number(item.reputation_delta || 0),
          metrics: (item.metrics || {}) as Record<string, number>,
        })),
      );
    }

    setIsLoading(false);
    setIsRefreshing(false);
  }

  const progress = useMemo(() => {
    if (!reputation) return 0;
    const next = nextLevel(reputation.reputation_score);
    if (!next) return 100;
    const start = currentLevelMinimum(reputation.reputation_score);
    return Math.max(
      0,
      Math.min(
        100,
        ((reputation.reputation_score - start) / Math.max(1, next.min - start)) *
          100,
      ),
    );
  }, [reputation]);

  const strengths = useMemo(() => {
    if (!reputation) return [] as string[];

    const pillars = [
      {
        label: "Audience",
        ratio: reputation.audience_score / 250,
        text: `${reputation.member_count.toLocaleString()} club members`,
      },
      {
        label: "Participation",
        ratio: reputation.participation_score / 300,
        text: `${reputation.unique_players.toLocaleString()} unique players`,
      },
      {
        label: "Return Value",
        ratio: reputation.return_score / 250,
        text: `${reputation.repeat_players.toLocaleString()} returning players`,
      },
      {
        label: "Consistency",
        ratio: reputation.consistency_score / 200,
        text: `${reputation.published_challenges} published challenges`,
      },
    ].sort((a, b) => b.ratio - a.ratio);

    return pillars.slice(0, 2).map((pillar) => `${pillar.label}: ${pillar.text}`);
  }, [reputation]);

  const nextMoves = useMemo(() => {
    if (!reputation) return [] as string[];
    const moves: string[] = [];
    const repeatRate =
      reputation.unique_players > 0
        ? reputation.repeat_players / reputation.unique_players
        : 0;

    if (reputation.member_count < 25) {
      moves.push("Grow the club towards 25 genuine members.");
    }
    if (reputation.unique_players < 20) {
      moves.push("Get more different members playing at least one challenge.");
    }
    if (repeatRate < 0.3 && reputation.unique_players >= 5) {
      moves.push("Give members a reason to return for another challenge.");
    }
    if (reputation.published_challenges < 5) {
      moves.push("Build a small library of high-quality published challenges.");
    }
    if (reputation.active_weeks < 4) {
      moves.push("Publish consistently across several different weeks.");
    }

    return moves.slice(0, 3);
  }, [reputation]);

  if (isLoading) {
    return (
      <section className="shrink-0 rounded-[26px] border border-violet-200/12 bg-violet-400/[0.035] p-5 text-xs text-white/42">
        Calculating Creator Reputation...
      </section>
    );
  }

  if (!reputation) {
    return (
      <section className="shrink-0 rounded-[26px] border border-violet-200/12 bg-violet-400/[0.035] p-5">
        <h2 className="text-xl font-black">Creator Reputation is not available yet.</h2>
        {errorMessage && (
          <p className="mt-2 text-xs leading-5 text-red-100/80">{errorMessage}</p>
        )}
      </section>
    );
  }

  const next = nextLevel(reputation.reputation_score);
  const ringPercent = Math.max(
    0,
    Math.min(100, reputation.reputation_score / 10),
  );

  return (
    <section className="shrink-0 overflow-hidden rounded-[28px] border border-violet-200/14 bg-[radial-gradient(circle_at_top_left,rgba(167,139,250,0.11),transparent_31%),linear-gradient(145deg,rgba(41,27,73,0.44),rgba(4,14,30,0.93))] p-5 backdrop-blur-xl sm:p-6">
      <div className="flex flex-col gap-5 xl:grid xl:grid-cols-[230px_minmax(0,1fr)_310px] xl:items-stretch">
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-violet-200/11 bg-black/16 p-5 text-center">
          <div
            className="grid h-36 w-36 place-items-center rounded-full p-[8px]"
            style={{
              background: `conic-gradient(rgba(196,181,253,0.92) ${ringPercent}%, rgba(255,255,255,0.07) ${ringPercent}% 100%)`,
            }}
          >
            <div className="grid h-full w-full place-items-center rounded-full border border-white/8 bg-[#061126]">
              <div>
                <strong className="block text-4xl font-black text-violet-100">
                  {reputation.reputation_score}
                </strong>
                <span className="mt-1 block text-[8px] font-black uppercase tracking-[0.12em] text-white/30">
                  / 1000 REP
                </span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-[8px] font-black uppercase tracking-[0.15em] text-violet-100/54">
            Creator Level
          </p>
          <h2 className="mt-1 text-2xl font-black text-violet-100">
            {reputation.level_name}
          </h2>

          {next ? (
            <div className="mt-4 w-full">
              <div className="flex justify-between gap-3 text-[8px] text-white/28">
                <span>{reputation.reputation_score} REP</span>
                <span>{next.min} · {next.name}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/30">
                <div
                  className="h-full rounded-full bg-violet-200/80"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="mt-4 text-[9px] font-bold text-amber-100/68">
              Highest current Creator Level
            </p>
          )}
        </div>

        <div className="rounded-[24px] border border-white/8 bg-white/[0.025] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-violet-100/58">
                Creator Reputation
              </p>
              <h2 className="mt-1 text-2xl font-black">
                Build value people return for.
              </h2>
              <p className="mt-2 max-w-2xl text-[10px] leading-5 text-white/38">
                Reputation rewards genuine audience, different players, returning
                players and consistent published work. Upload volume alone cannot
                dominate the score.
              </p>
            </div>

            <button
              type="button"
              disabled={isRefreshing}
              onClick={() => void refreshReputation(true)}
              className="min-h-9 shrink-0 rounded-full border border-violet-200/16 bg-violet-300/[0.065] px-4 text-[8px] font-black uppercase tracking-[0.09em] text-violet-100 disabled:opacity-35"
            >
              {isRefreshing ? "Refreshing..." : "Recalculate"}
            </button>
          </div>

          {errorMessage && (
            <p className="mt-3 rounded-xl border border-red-200/14 bg-red-400/[0.06] px-3 py-2 text-[10px] text-red-100">
              {errorMessage}
            </p>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Pillar
              label="Audience"
              score={reputation.audience_score}
              max={250}
              stat={`${reputation.member_count.toLocaleString()} members`}
            />
            <Pillar
              label="Participation"
              score={reputation.participation_score}
              max={300}
              stat={`${reputation.unique_players.toLocaleString()} unique · ${reputation.total_plays.toLocaleString()} plays`}
            />
            <Pillar
              label="Return Value"
              score={reputation.return_score}
              max={250}
              stat={`${reputation.repeat_players.toLocaleString()} returning players`}
            />
            <Pillar
              label="Consistency"
              score={reputation.consistency_score}
              max={200}
              stat={`${reputation.published_challenges} published · ${reputation.active_weeks} active weeks`}
            />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <InsightBox title="What is helping" items={strengths} positive />
            <InsightBox title="Next moves" items={nextMoves} />
          </div>
        </div>

        <div className="rounded-[24px] border border-white/8 bg-black/14 p-5">
          <p className="text-[8px] font-black uppercase tracking-[0.15em] text-white/34">
            Reputation History
          </p>
          <h3 className="mt-1 text-xl font-black">Recent changes</h3>

          {history.length === 0 ? (
            <p className="mt-4 text-[10px] leading-5 text-white/30">
              Your first reputation snapshot will appear here after calculation.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {history.slice(0, 6).map((item, index) => (
                <div
                  key={`${item.created_at}-${index}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-white/7 bg-white/[0.025] px-3 py-2.5"
                >
                  <span className="min-w-0">
                    <strong className="block truncate text-[10px] text-white/72">
                      {item.level_name}
                    </strong>
                    <small className="mt-0.5 block text-[8px] text-white/26">
                      {shortDate(item.created_at)}
                    </small>
                  </span>
                  <span className="text-right">
                    <strong className="block text-sm text-violet-100">
                      {item.reputation_score}
                    </strong>
                    <small
                      className={`text-[8px] font-bold ${
                        item.reputation_delta > 0
                          ? "text-emerald-100/72"
                          : item.reputation_delta < 0
                            ? "text-red-100/72"
                            : "text-white/24"
                      }`}
                    >
                      {item.reputation_delta > 0 ? "+" : ""}
                      {item.reputation_delta}
                    </small>
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className="mt-4 text-[8px] leading-4 text-white/22">
            Calculated {shortDate(reputation.calculated_at)}. Reputation is a
            creator-growth signal, not a school mastery score.
          </p>
        </div>
      </div>
    </section>
  );
}

function Pillar({
  label,
  score,
  max,
  stat,
}: {
  label: string;
  score: number;
  max: number;
  stat: string;
}) {
  const percent = Math.max(0, Math.min(100, (score / max) * 100));
  return (
    <div className="rounded-2xl border border-white/8 bg-black/14 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <strong className="block text-[11px] text-white/78">{label}</strong>
          <span className="mt-1 block text-[8px] text-white/28">{stat}</span>
        </div>
        <strong className="text-sm text-violet-100">
          {score}/{max}
        </strong>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/30">
        <div
          className="h-full rounded-full bg-violet-200/75"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function InsightBox({
  title,
  items,
  positive = false,
}: {
  title: string;
  items: string[];
  positive?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        positive
          ? "border-emerald-200/10 bg-emerald-400/[0.035]"
          : "border-amber-200/10 bg-amber-300/[0.03]"
      }`}
    >
      <p
        className={`text-[8px] font-black uppercase tracking-[0.12em] ${
          positive ? "text-emerald-100/58" : "text-amber-100/58"
        }`}
      >
        {title}
      </p>
      {items.length === 0 ? (
        <p className="mt-2 text-[9px] leading-4 text-white/28">
          Keep building genuine engagement.
        </p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {items.map((item) => (
            <p key={item} className="text-[9px] leading-4 text-white/42">
              · {item}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
