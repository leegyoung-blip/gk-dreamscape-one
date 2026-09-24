"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Milestone = {
  key: string;
  label: string;
  requirement: string;
  amount_dt: number;
  earned: boolean;
  claimed: boolean;
  claimable: boolean;
};

type RewardClaim = {
  reward_key: string;
  reward_type: "cycle" | "milestone";
  amount_dt: number;
  title: string;
  details: Record<string, unknown>;
  claimed_at: string;
};

type Dashboard = {
  creator_partner_id: string;
  creator_slug: string;
  creator_display_name: string;

  reputation_score: number;
  level_name: string;
  moderation_status: "good" | "limited" | "paused";

  rewards_enabled: boolean;
  milestone_rewards_enabled: boolean;
  minimum_reputation: number;
  cycle_days: number;
  cycle_cap_dt: number;

  lifetime_dt: number;
  cycle_available_dt: number;
  cycle_eligible: boolean;
  baseline_at: string;
  next_claim_at: string;
  last_claim_at: string | null;

  member_growth: number;
  unique_player_growth: number;
  repeat_player_growth: number;
  play_growth: number;
  published_growth: number;

  breakdown: Record<string, number>;
  milestones: Milestone[];
  claimable_milestones_dt: number;
  recent_claims: RewardClaim[];
};

function normalize(row: Record<string, unknown>): Dashboard {
  return {
    creator_partner_id: String(row.creator_partner_id || ""),
    creator_slug: String(row.creator_slug || ""),
    creator_display_name: String(row.creator_display_name || "Creator"),

    reputation_score: Number(row.reputation_score || 0),
    level_name: String(row.level_name || "New Creator"),
    moderation_status: String(
      row.moderation_status || "good",
    ) as Dashboard["moderation_status"],

    rewards_enabled: Boolean(row.rewards_enabled),
    milestone_rewards_enabled: Boolean(row.milestone_rewards_enabled),
    minimum_reputation: Number(row.minimum_reputation || 0),
    cycle_days: Number(row.cycle_days || 7),
    cycle_cap_dt: Number(row.cycle_cap_dt || 0),

    lifetime_dt: Number(row.lifetime_dt || 0),
    cycle_available_dt: Number(row.cycle_available_dt || 0),
    cycle_eligible: Boolean(row.cycle_eligible),
    baseline_at: String(row.baseline_at || ""),
    next_claim_at: String(row.next_claim_at || ""),
    last_claim_at: row.last_claim_at ? String(row.last_claim_at) : null,

    member_growth: Number(row.member_growth || 0),
    unique_player_growth: Number(row.unique_player_growth || 0),
    repeat_player_growth: Number(row.repeat_player_growth || 0),
    play_growth: Number(row.play_growth || 0),
    published_growth: Number(row.published_growth || 0),

    breakdown: (row.breakdown || {}) as Record<string, number>,
    milestones: (((row.milestones || []) as unknown[]) || []).map((item) => {
      const value = item as Record<string, unknown>;
      return {
        key: String(value.key || ""),
        label: String(value.label || ""),
        requirement: String(value.requirement || ""),
        amount_dt: Number(value.amount_dt || 0),
        earned: Boolean(value.earned),
        claimed: Boolean(value.claimed),
        claimable: Boolean(value.claimable),
      };
    }),
    claimable_milestones_dt: Number(row.claimable_milestones_dt || 0),
    recent_claims: (((row.recent_claims || []) as unknown[]) || []).map(
      (item) => {
        const value = item as Record<string, unknown>;
        return {
          reward_key: String(value.reward_key || ""),
          reward_type: String(
            value.reward_type || "milestone",
          ) as RewardClaim["reward_type"],
          amount_dt: Number(value.amount_dt || 0),
          title: String(value.title || "Creator Reward"),
          details: (value.details || {}) as Record<string, unknown>,
          claimed_at: String(value.claimed_at || ""),
        };
      },
    ),
  };
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function timeUntil(value: string) {
  const target = new Date(value).getTime();
  const difference = target - Date.now();

  if (!Number.isFinite(target) || difference <= 0) return "Ready now";

  const hours = Math.ceil(difference / (60 * 60 * 1000));
  if (hours < 24) return `${hours}h`;

  return `${Math.ceil(hours / 24)}d`;
}

export default function CreatorRewardsPanel() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState<"cycle" | "milestone" | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "get_my_creator_rewards_dashboard_v1",
    );

    if (error) {
      setDashboard(null);
      setErrorMessage(
        error.message || "Creator Rewards could not be loaded.",
      );
      setIsLoading(false);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    setDashboard(row ? normalize(row as Record<string, unknown>) : null);
    setIsLoading(false);
  }

  async function claimCycle() {
    setIsClaiming("cycle");
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "creator_claim_cycle_reward_v1",
    );

    if (error) {
      setErrorMessage(error.message || "The Creator Reward could not be claimed.");
      setIsClaiming(null);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    const amount = Number(row?.amount_dt || 0);

    setMessage(
      `Creator Reward claimed: +${amount.toLocaleString()} DT added to your Dream Token wallet.`,
    );
    window.dispatchEvent(new Event("dream-tokens-updated"));
    await load();
    setIsClaiming(null);
  }

  async function claimMilestones() {
    setIsClaiming("milestone");
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "creator_claim_available_milestones_v1",
    );

    if (error) {
      setErrorMessage(
        error.message || "Creator milestones could not be claimed.",
      );
      setIsClaiming(null);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    const amount = Number(row?.amount_dt || 0);
    const count = Number(row?.claimed_count || 0);

    setMessage(
      `${count} creator milestone${count === 1 ? "" : "s"} claimed: +${amount.toLocaleString()} DT.`,
    );
    window.dispatchEvent(new Event("dream-tokens-updated"));
    await load();
    setIsClaiming(null);
  }

  const cycleBreakdown = useMemo(() => {
    if (!dashboard) return [];

    return [
      {
        label: "New members",
        growth: dashboard.member_growth,
        dt: Number(dashboard.breakdown.members_dt || 0),
      },
      {
        label: "New genuine players",
        growth: dashboard.unique_player_growth,
        dt: Number(dashboard.breakdown.unique_players_dt || 0),
      },
      {
        label: "Returning players",
        growth: dashboard.repeat_player_growth,
        dt: Number(dashboard.breakdown.repeat_players_dt || 0),
      },
      {
        label: "Challenge plays",
        growth: dashboard.play_growth,
        dt: Number(dashboard.breakdown.plays_dt || 0),
      },
      {
        label: "Published challenges",
        growth: dashboard.published_growth,
        dt: Number(dashboard.breakdown.publishing_dt || 0),
      },
    ];
  }, [dashboard]);

  if (isLoading) {
    return (
      <section className="shrink-0 rounded-[26px] border border-emerald-200/12 bg-emerald-400/[0.035] p-5 text-xs text-white/42">
        Loading Creator Rewards...
      </section>
    );
  }

  if (!dashboard) {
    return (
      <section className="shrink-0 rounded-[26px] border border-red-200/12 bg-red-400/[0.035] p-5">
        <p className="text-xs text-red-100">
          {errorMessage || "Creator Rewards are unavailable."}
        </p>
      </section>
    );
  }

  const reputationUnlocked =
    dashboard.reputation_score >= dashboard.minimum_reputation;

  const multiplier = Number(
    dashboard.breakdown.moderation_multiplier ?? 1,
  );

  return (
    <section className="shrink-0 overflow-hidden rounded-[28px] border border-emerald-200/13 bg-[linear-gradient(135deg,rgba(17,83,62,0.18),rgba(4,16,34,0.90))] backdrop-blur-xl">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-100/62">
              Phase 5 · Creator Rewards
            </p>
            <h2 className="mt-1 text-2xl font-black sm:text-3xl">
              Turn genuine engagement into Dream Tokens.
            </h2>
            <p className="mt-2 max-w-3xl text-[10px] leading-5 text-white/42">
              Creator Rewards value people joining, playing, returning and
              enjoying what you build. Upload volume alone does not drive
              rewards.
            </p>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2">
            <Metric
              label="Lifetime Creator Rewards"
              value={`${dashboard.lifetime_dt.toLocaleString()} DT`}
            />
            <Metric
              label="Current Cycle"
              value={`${dashboard.cycle_available_dt.toLocaleString()} DT`}
              accent
            />
          </div>
        </div>

        {(message || errorMessage) && (
          <div className="mt-4">
            {message && (
              <p className="rounded-xl border border-emerald-200/16 bg-emerald-400/[0.07] px-3 py-2 text-[10px] text-emerald-100">
                {message}
              </p>
            )}
            {errorMessage && (
              <p className="rounded-xl border border-red-200/16 bg-red-400/[0.07] px-3 py-2 text-[10px] text-red-100">
                {errorMessage}
              </p>
            )}
          </div>
        )}

        {!dashboard.rewards_enabled && (
          <Notice>
            Creator Rewards are currently paused across Dreamscape. Your
            reputation and engagement continue building in the meantime.
          </Notice>
        )}

        {dashboard.moderation_status === "paused" && (
          <Notice>
            Creator Rewards are paused for this creator while moderation status
            is Paused.
          </Notice>
        )}

        {dashboard.moderation_status === "limited" && (
          <Notice>
            Creator status is Limited. Cycle rewards are currently reduced to
            50%, and milestone claims wait until status returns to Good.
          </Notice>
        )}

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <section className="rounded-[22px] border border-white/9 bg-black/16 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.13em] text-emerald-100/56">
                  Reward Cycle · {dashboard.cycle_days} days
                </p>
                <h3 className="mt-1 text-xl font-black">
                  {dashboard.cycle_available_dt > 0
                    ? `${dashboard.cycle_available_dt.toLocaleString()} DT building`
                    : "Build value for your next reward"}
                </h3>
                <p className="mt-1 text-[9px] text-white/30">
                  Cycle cap: {dashboard.cycle_cap_dt.toLocaleString()} DT ·
                  minimum {dashboard.minimum_reputation} REP
                </p>
              </div>

              <span
                className={`w-fit rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.08em] ${
                  dashboard.cycle_eligible
                    ? "border-emerald-200/20 bg-emerald-400/[0.08] text-emerald-100"
                    : "border-white/10 bg-white/[0.035] text-white/38"
                }`}
              >
                {dashboard.cycle_eligible
                  ? "Ready to Claim"
                  : !reputationUnlocked
                    ? `${dashboard.minimum_reputation - dashboard.reputation_score} REP to unlock`
                    : `${timeUntil(dashboard.next_claim_at)} until claim`}
              </span>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {cycleBreakdown.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-3"
                >
                  <strong className="block text-sm text-white">
                    +{item.growth.toLocaleString()}
                  </strong>
                  <span className="mt-1 block text-[7px] font-black uppercase tracking-[0.07em] text-white/26">
                    {item.label}
                  </span>
                  <span className="mt-2 block text-[9px] font-bold text-emerald-100/66">
                    +{item.dt} DT
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {Number(dashboard.breakdown.retention_bonus_dt || 0) > 0 && (
                <RewardChip>
                  Retention +{dashboard.breakdown.retention_bonus_dt} DT
                </RewardChip>
              )}
              {Number(dashboard.breakdown.reputation_bonus_dt || 0) > 0 && (
                <RewardChip>
                  Reputation +{dashboard.breakdown.reputation_bonus_dt} DT
                </RewardChip>
              )}
              {multiplier < 1 && (
                <RewardChip>
                  Moderation ×{multiplier.toFixed(1)}
                </RewardChip>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/8 pt-4">
              <button
                type="button"
                disabled={!dashboard.cycle_eligible || isClaiming !== null}
                onClick={() => void claimCycle()}
                className="min-h-10 rounded-full border border-emerald-200/22 bg-emerald-400/[0.09] px-5 text-[8px] font-black uppercase tracking-[0.09em] text-emerald-100 disabled:cursor-not-allowed disabled:opacity-35"
              >
                {isClaiming === "cycle"
                  ? "Claiming..."
                  : `Claim ${dashboard.cycle_available_dt.toLocaleString()} DT`}
              </button>

              <span className="text-[8px] text-white/26">
                Baseline {formatDate(dashboard.baseline_at)} · next cycle{" "}
                {formatDate(dashboard.next_claim_at)}
              </span>
            </div>
          </section>

          <section className="rounded-[22px] border border-amber-200/12 bg-amber-300/[0.035] p-4">
            <p className="text-[8px] font-black uppercase tracking-[0.13em] text-amber-100/58">
              Creator Milestones
            </p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <h3 className="text-xl font-black">
                  One-time achievements
                </h3>
                <p className="mt-1 text-[9px] leading-4 text-white/30">
                  Big moments reward sustained creator growth.
                </p>
              </div>
              <strong className="text-xl text-amber-100">
                {dashboard.claimable_milestones_dt.toLocaleString()} DT
              </strong>
            </div>

            <div className="mt-4 max-h-[280px] space-y-2 overflow-y-auto pr-1">
              {dashboard.milestones.map((milestone) => (
                <div
                  key={milestone.key}
                  className={`rounded-xl border px-3 py-3 ${
                    milestone.claimed
                      ? "border-emerald-200/10 bg-emerald-400/[0.035]"
                      : milestone.claimable
                        ? "border-amber-200/18 bg-amber-300/[0.055]"
                        : "border-white/8 bg-black/12"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <strong className="block text-[10px] text-white/78">
                        {milestone.label}
                      </strong>
                      <small className="mt-1 block text-[8px] text-white/28">
                        {milestone.requirement}
                      </small>
                    </span>
                    <span
                      className={`shrink-0 text-[9px] font-black ${
                        milestone.claimed
                          ? "text-emerald-100/62"
                          : milestone.earned
                            ? "text-amber-100"
                            : "text-white/24"
                      }`}
                    >
                      {milestone.claimed
                        ? "Claimed"
                        : `+${milestone.amount_dt} DT`}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={
                dashboard.claimable_milestones_dt <= 0 ||
                isClaiming !== null ||
                dashboard.moderation_status !== "good"
              }
              onClick={() => void claimMilestones()}
              className="mt-4 min-h-10 w-full rounded-full border border-amber-200/22 bg-amber-300/[0.09] px-4 text-[8px] font-black uppercase tracking-[0.09em] text-amber-100 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {isClaiming === "milestone"
                ? "Claiming..."
                : dashboard.claimable_milestones_dt > 0
                  ? `Claim ${dashboard.claimable_milestones_dt.toLocaleString()} DT`
                  : "No New Milestones"}
            </button>
          </section>
        </div>

        <section className="mt-4 rounded-[22px] border border-white/8 bg-black/14 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.13em] text-white/32">
                Recent Creator Rewards
              </p>
              <h3 className="mt-1 text-lg font-black">
                Reward history
              </h3>
            </div>
          </div>

          {dashboard.recent_claims.length === 0 ? (
            <p className="mt-3 text-[10px] text-white/30">
              Your first claimed Creator Reward will appear here.
            </p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {dashboard.recent_claims.slice(0, 6).map((claim) => (
                <div
                  key={`${claim.reward_key}-${claim.claimed_at}`}
                  className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <strong className="block truncate text-[9px] text-white/68">
                        {claim.title}
                      </strong>
                      <small className="mt-1 block text-[7px] uppercase tracking-[0.08em] text-white/24">
                        {claim.reward_type} · {formatDate(claim.claimed_at)}
                      </small>
                    </span>
                    <strong className="shrink-0 text-sm text-emerald-100">
                      +{claim.amount_dt.toLocaleString()} DT
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="mt-4 rounded-xl border border-cyan-200/10 bg-cyan-300/[0.025] px-3 py-2 text-[8px] leading-4 text-cyan-100/46">
          Dream Tokens are fictional Dreamscape currency used inside the
          platform. Creator Rewards cannot be exchanged for cash or withdrawn
          as real money.
        </p>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`min-w-[150px] rounded-[18px] border px-4 py-3 ${
        accent
          ? "border-emerald-200/16 bg-emerald-400/[0.06]"
          : "border-white/9 bg-black/14"
      }`}
    >
      <strong
        className={`block text-xl ${accent ? "text-emerald-100" : "text-white"}`}
      >
        {value}
      </strong>
      <span className="mt-1 block text-[7px] font-black uppercase tracking-[0.08em] text-white/26">
        {label}
      </span>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded-xl border border-amber-200/14 bg-amber-300/[0.045] px-3 py-2 text-[9px] leading-4 text-amber-100/70">
      {children}
    </p>
  );
}

function RewardChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-emerald-200/12 bg-emerald-400/[0.045] px-3 py-1 text-[7px] font-black uppercase tracking-[0.07em] text-emerald-100/68">
      {children}
    </span>
  );
}
