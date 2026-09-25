"use client";

const LEVEL_STYLES: Record<number, string> = {
  1: "border-white/10 bg-white/[0.035] text-white/52",
  2: "border-cyan-200/18 bg-cyan-300/[0.06] text-cyan-100",
  3: "border-violet-200/18 bg-violet-300/[0.065] text-violet-100",
  4: "border-amber-200/20 bg-amber-300/[0.075] text-amber-100",
  5: "border-fuchsia-200/22 bg-fuchsia-300/[0.08] text-fuchsia-100",
};

export default function CreatorClubLevelBadge({
  levelNumber,
  levelName,
  score,
  compact = false,
}: {
  levelNumber: number;
  levelName: string;
  score?: number;
  compact?: boolean;
}) {
  const level = Math.max(1, Math.min(5, Number(levelNumber || 1)));

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border font-black uppercase tracking-[0.08em] ${
        compact ? "px-2.5 py-1 text-[7px]" : "px-3 py-1.5 text-[8px]"
      } ${LEVEL_STYLES[level] || LEVEL_STYLES[1]}`}
    >
      <span>L{level}</span>
      <span>{levelName || "Starter Club"}</span>
      {typeof score === "number" && !compact && (
        <span className="opacity-55">· {Math.round(score)}</span>
      )}
    </span>
  );
}
