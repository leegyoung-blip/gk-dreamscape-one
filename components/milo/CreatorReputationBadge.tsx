"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type PublicReputation = {
  reputation_score: number;
  level_name: string;
};

export default function CreatorReputationBadge({
  creatorSlug,
  compact = false,
}: {
  creatorSlug: string;
  compact?: boolean;
}) {
  const [reputation, setReputation] = useState<PublicReputation | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!creatorSlug) return;
      const { data, error } = await supabase.rpc(
        "get_creator_reputation_by_slug_v1",
        { p_creator_slug: creatorSlug },
      );
      if (!mounted || error) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return;
      setReputation({
        reputation_score: Number(row.reputation_score || 0),
        level_name: String(row.level_name || "New Creator"),
      });
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [creatorSlug]);

  const levelName = reputation?.level_name || "New Creator";
  const score = reputation?.reputation_score || 0;

  return (
    <span
      className={`inline-flex items-center rounded-full border border-violet-200/16 bg-violet-300/[0.065] font-black uppercase tracking-[0.08em] text-violet-100 ${
        compact ? "px-2.5 py-1 text-[7px]" : "px-3 py-1.5 text-[8px]"
      }`}
      title="Creator Reputation grows through genuine members, participation, returning players and consistent published challenges."
    >
      {levelName} · {score} REP
    </span>
  );
}
