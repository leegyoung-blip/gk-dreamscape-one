"use client";

import CreatorClubLevelBadge from "@/components/milo/creator-engine/CreatorClubLevelBadge";

export type ClubRequirement = {
  key: string;
  label: string;
  current: number;
  target: number;
  met: boolean;
};

export type ClubAchievement = {
  key: string;
  name: string;
  description: string;
  category: string;
  metric_key: string;
  current: number;
  target: number;
  earned: boolean;
  earned_at: string | null;
};

export type ClubLevelHistoryRow = {
  from_level_number: number | null;
  from_level_key: string | null;
  to_level_number: number;
  to_level_key: string;
  to_level_name: string;
  progression_score: number;
  reached_at: string;
};

export type ClubProgressionPayload = {
  club_id: string;
  club_slug: string;
  club_name: string;
  creator_partner_id: string;

  level_number: number;
  level_key: string;
  level_name: string;
  level_description: string;
  badge_label: string;
  progression_score: number;
  score_progress_percent: number;

  next_level_number: number | null;
  next_level_key: string | null;
  next_level_name: string | null;
  next_level_description: string | null;
  next_level_min_score: number | null;
  next_requirements: ClubRequirement[];

  member_count: number;
  unique_players: number;
  repeat_players: number;
  repeat_rate: number;
  total_plays: number;
  published_challenges: number;
  active_weeks: number;
  room_rounds: number;
  room_players: number;

  score_breakdown: {
    community: number;
    activity: number;
    return: number;
    consistency: number;
    creation: number;
  };

  current_unlocks: string[];
  next_unlocks: string[];
  achievements: ClubAchievement[];
  level_history: ClubLevelHistoryRow[];
  calculated_at: string | null;
};

export function normalizeClubProgressionPayload(
  raw: unknown,
): ClubProgressionPayload | null {
  if (!raw || typeof raw !== "object") return null;

  const row = raw as Record<string, unknown>;
  const breakdown =
    row.score_breakdown && typeof row.score_breakdown === "object"
      ? (row.score_breakdown as Record<string, unknown>)
      : {};

  return {
    club_id: String(row.club_id || ""),
    club_slug: String(row.club_slug || ""),
    club_name: String(row.club_name || "Creator Club"),
    creator_partner_id: String(row.creator_partner_id || ""),

    level_number: Number(row.level_number || 1),
    level_key: String(row.level_key || "starter"),
    level_name: String(row.level_name || "Starter Club"),
    level_description: String(row.level_description || ""),
    badge_label: String(row.badge_label || "Starter"),
    progression_score: Number(row.progression_score || 0),
    score_progress_percent: Number(row.score_progress_percent || 0),

    next_level_number:
      row.next_level_number === null || row.next_level_number === undefined
        ? null
        : Number(row.next_level_number),
    next_level_key: row.next_level_key ? String(row.next_level_key) : null,
    next_level_name: row.next_level_name ? String(row.next_level_name) : null,
    next_level_description: row.next_level_description
      ? String(row.next_level_description)
      : null,
    next_level_min_score:
      row.next_level_min_score === null || row.next_level_min_score === undefined
        ? null
        : Number(row.next_level_min_score),
    next_requirements: ((row.next_requirements || []) as unknown[]).map(
      (item) => {
        const value = item as Record<string, unknown>;
        return {
          key: String(value.key || ""),
          label: String(value.label || "Requirement"),
          current: Number(value.current || 0),
          target: Number(value.target || 0),
          met: Boolean(value.met),
        };
      },
    ),

    member_count: Number(row.member_count || 0),
    unique_players: Number(row.unique_players || 0),
    repeat_players: Number(row.repeat_players || 0),
    repeat_rate: Number(row.repeat_rate || 0),
    total_plays: Number(row.total_plays || 0),
    published_challenges: Number(row.published_challenges || 0),
    active_weeks: Number(row.active_weeks || 0),
    room_rounds: Number(row.room_rounds || 0),
    room_players: Number(row.room_players || 0),

    score_breakdown: {
      community: Number(breakdown.community || 0),
      activity: Number(breakdown.activity || 0),
      return: Number(breakdown.return || 0),
      consistency: Number(breakdown.consistency || 0),
      creation: Number(breakdown.creation || 0),
    },

    current_unlocks: ((row.current_unlocks || []) as unknown[]).map(String),
    next_unlocks: ((row.next_unlocks || []) as unknown[]).map(String),
    achievements: ((row.achievements || []) as unknown[]).map((item) => {
      const value = item as Record<string, unknown>;
      return {
        key: String(value.key || ""),
        name: String(value.name || "Achievement"),
        description: String(value.description || ""),
        category: String(value.category || "Club"),
        metric_key: String(value.metric_key || ""),
        current: Number(value.current || 0),
        target: Number(value.target || 0),
        earned: Boolean(value.earned),
        earned_at: value.earned_at ? String(value.earned_at) : null,
      };
    }),
    level_history: ((row.level_history || []) as unknown[]).map((item) => {
      const value = item as Record<string, unknown>;
      return {
        from_level_number:
          value.from_level_number === null ||
          value.from_level_number === undefined
            ? null
            : Number(value.from_level_number),
        from_level_key: value.from_level_key
          ? String(value.from_level_key)
          : null,
        to_level_number: Number(value.to_level_number || 1),
        to_level_key: String(value.to_level_key || "starter"),
        to_level_name: String(value.to_level_name || "Starter Club"),
        progression_score: Number(value.progression_score || 0),
        reached_at: String(value.reached_at || ""),
      };
    }),
    calculated_at: row.calculated_at ? String(row.calculated_at) : null,
  };
}

function formatRequirement(requirement: ClubRequirement) {
  if (requirement.key === "repeat_rate") {
    return `${Math.round(requirement.current * 100)}% / ${Math.round(
      requirement.target * 100,
    )}%`;
  }

  return `${Math.round(requirement.current).toLocaleString()} / ${Math.round(
    requirement.target,
  ).toLocaleString()}`;
}

function shortDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function CreatorClubProgressionCard({
  progression,
  compact = false,
  showBreakdown = false,
}: {
  progression: ClubProgressionPayload;
  compact?: boolean;
  showBreakdown?: boolean;
}) {
  const earnedAchievements = progression.achievements.filter(
    (achievement) => achievement.earned,
  );
  const nextAchievements = progression.achievements
    .filter((achievement) => !achievement.earned)
    .slice(0, compact ? 3 : 6);

  return (
    <section className="rounded-[26px] border border-cyan-200/12 bg-[linear-gradient(145deg,rgba(12,57,78,0.13),rgba(3,13,29,0.91))] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100/56">
            Club Level
          </p>
          <h3 className="mt-1 text-xl font-black">{progression.club_name}</h3>
          {!compact && progression.level_description && (
            <p className="mt-2 max-w-2xl text-[9px] leading-4 text-white/30">
              {progression.level_description}
            </p>
          )}
        </div>

        <CreatorClubLevelBadge
          levelNumber={progression.level_number}
          levelName={progression.level_name}
          score={progression.progression_score}
        />
      </div>

      <div className="mt-4">
        <div className="flex items-end justify-between gap-3">
          <span>
            <strong className="block text-3xl text-cyan-100">
              {progression.progression_score}
            </strong>
            <small className="text-[7px] font-black uppercase tracking-[0.08em] text-white/25">
              progression score / 1000
            </small>
          </span>

          {progression.next_level_name ? (
            <span className="text-right text-[8px] text-white/28">
              Next: <strong className="text-white/54">{progression.next_level_name}</strong>
            </span>
          ) : (
            <span className="text-[8px] font-black uppercase tracking-[0.08em] text-fuchsia-100/60">
              Highest Club Level
            </span>
          )}
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.05]">
          <div
            className="h-full rounded-full bg-cyan-200/70 transition-all"
            style={{
              width: `${progression.next_level_name ? Math.max(2, progression.score_progress_percent) : 100}%`,
            }}
          />
        </div>
      </div>

      {progression.next_level_name && progression.next_requirements.length > 0 && (
        <div className="mt-4">
          <p className="text-[7px] font-black uppercase tracking-[0.10em] text-white/25">
            What the club still needs
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {progression.next_requirements.map((requirement) => (
              <div
                key={requirement.key}
                className={`rounded-xl border px-3 py-2.5 ${
                  requirement.met
                    ? "border-emerald-200/10 bg-emerald-400/[0.035]"
                    : "border-white/7 bg-black/12"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-[8px] text-white/52">
                    {requirement.label}
                  </strong>
                  <span
                    className={`text-[7px] font-black uppercase tracking-[0.07em] ${
                      requirement.met ? "text-emerald-100/70" : "text-white/24"
                    }`}
                  >
                    {requirement.met ? "Done" : formatRequirement(requirement)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!compact && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-[18px] border border-violet-200/9 bg-violet-300/[0.025] p-4">
            <p className="text-[7px] font-black uppercase tracking-[0.10em] text-violet-100/50">
              Current Level Unlocks
            </p>
            <div className="mt-3 grid gap-2">
              {progression.current_unlocks.map((unlock) => (
                <div
                  key={unlock}
                  className="rounded-xl border border-white/7 bg-black/12 px-3 py-2 text-[8px] text-white/42"
                >
                  ✓ {unlock}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[18px] border border-amber-200/9 bg-amber-300/[0.025] p-4">
            <p className="text-[7px] font-black uppercase tracking-[0.10em] text-amber-100/50">
              Club Metrics
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <MiniMetric label="Members" value={progression.member_count} />
              <MiniMetric label="Players" value={progression.unique_players} />
              <MiniMetric label="Returning" value={progression.repeat_players} />
              <MiniMetric label="Plays" value={progression.total_plays} />
              <MiniMetric label="Challenges" value={progression.published_challenges} />
              <MiniMetric label="Active Weeks" value={progression.active_weeks} />
            </div>
          </div>
        </div>
      )}

      {showBreakdown && (
        <div className="mt-4 rounded-[18px] border border-white/7 bg-black/12 p-4">
          <p className="text-[7px] font-black uppercase tracking-[0.10em] text-white/24">
            Score Breakdown
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <MiniMetric label="Community" value={progression.score_breakdown.community} />
            <MiniMetric label="Activity" value={progression.score_breakdown.activity} />
            <MiniMetric label="Return" value={progression.score_breakdown.return} />
            <MiniMetric label="Consistency" value={progression.score_breakdown.consistency} />
            <MiniMetric label="Creation" value={progression.score_breakdown.creation} />
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-[18px] border border-emerald-200/9 bg-emerald-400/[0.02] p-4">
          <div className="flex items-end justify-between gap-2">
            <span>
              <p className="text-[7px] font-black uppercase tracking-[0.10em] text-emerald-100/48">
                Achievements
              </p>
              <strong className="mt-1 block text-lg text-emerald-100">
                {earnedAchievements.length}/{progression.achievements.length}
              </strong>
            </span>
          </div>

          <div className="mt-3 grid gap-2">
            {earnedAchievements.slice(0, compact ? 3 : 5).map((achievement) => (
              <div
                key={achievement.key}
                className="rounded-xl border border-emerald-200/9 bg-emerald-400/[0.03] px-3 py-2"
              >
                <strong className="block text-[8px] text-emerald-100/72">
                  {achievement.name}
                </strong>
                {!compact && (
                  <small className="mt-1 block text-[7px] leading-3 text-white/24">
                    {achievement.description}
                    {achievement.earned_at ? ` · ${shortDate(achievement.earned_at)}` : ""}
                  </small>
                )}
              </div>
            ))}

            {earnedAchievements.length === 0 && (
              <p className="text-[8px] text-white/24">
                Club achievements will appear here as the community grows.
              </p>
            )}
          </div>
        </div>

        {!compact && (
          <div className="rounded-[18px] border border-white/7 bg-black/12 p-4">
            <p className="text-[7px] font-black uppercase tracking-[0.10em] text-white/24">
              Next Achievements
            </p>
            <div className="mt-3 grid gap-2">
              {nextAchievements.map((achievement) => {
                const progress = Math.max(
                  0,
                  Math.min(100, (achievement.current / Math.max(1, achievement.target)) * 100),
                );

                return (
                  <div key={achievement.key} className="rounded-xl border border-white/7 bg-white/[0.02] px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-[8px] text-white/48">
                        {achievement.name}
                      </strong>
                      <span className="text-[7px] text-white/22">
                        {Math.round(achievement.current).toLocaleString()}/
                        {Math.round(achievement.target).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                      <div
                        className="h-full rounded-full bg-white/25"
                        style={{ width: `${Math.max(2, progress)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {!compact && progression.level_history.length > 0 && (
        <div className="mt-4 border-t border-white/7 pt-4">
          <p className="text-[7px] font-black uppercase tracking-[0.10em] text-white/24">
            Level History
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {progression.level_history.slice(0, 5).map((history, index) => (
              <span
                key={`${history.to_level_key}-${history.reached_at}-${index}`}
                className="rounded-full border border-white/8 bg-white/[0.025] px-3 py-1.5 text-[7px] text-white/32"
              >
                L{history.to_level_number} {history.to_level_name} · {shortDate(history.reached_at)}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
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
      <strong className="block text-sm text-cyan-100">
        {typeof value === "number" ? value.toLocaleString() : value}
      </strong>
      <span className="mt-1 block text-[6px] font-black uppercase tracking-[0.07em] text-white/22">
        {label}
      </span>
    </div>
  );
}
