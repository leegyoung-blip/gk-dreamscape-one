"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ReactionKey =
  | "fun"
  | "tricky"
  | "learned"
  | "great"
  | "more_like_this";

type ReactionPayload = {
  my_reaction: ReactionKey | null;
  counts: Record<ReactionKey, number>;
};

const REACTIONS: {
  key: ReactionKey;
  label: string;
  icon: string;
}[] = [
  { key: "fun", label: "Fun", icon: "★" },
  { key: "tricky", label: "Tricky", icon: "◆" },
  { key: "learned", label: "Learned Something", icon: "✦" },
  { key: "great", label: "Great Challenge", icon: "●" },
  { key: "more_like_this", label: "More Like This", icon: "↻" },
];

const EMPTY_COUNTS: Record<ReactionKey, number> = {
  fun: 0,
  tricky: 0,
  learned: 0,
  great: 0,
  more_like_this: 0,
};

export default function CreatorChallengeReactions({
  quizId,
}: {
  quizId: string;
}) {
  const [payload, setPayload] = useState<ReactionPayload>({
    my_reaction: null,
    counts: EMPTY_COUNTS,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void load();
  }, [quizId]);

  async function load() {
    const { data, error } = await supabase.rpc(
      "get_creator_quiz_reactions_v2",
      { p_quiz_id: quizId },
    );

    if (error || !data) return;

    const row = data as unknown as {
      my_reaction?: ReactionKey | null;
      counts?: Partial<Record<ReactionKey, number>>;
    };

    setPayload({
      my_reaction: row.my_reaction || null,
      counts: {
        ...EMPTY_COUNTS,
        ...(row.counts || {}),
      },
    });
  }

  async function choose(reaction: ReactionKey) {
    setIsSaving(true);
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "creator_submit_quiz_reaction_v2",
      {
        p_quiz_id: quizId,
        p_reaction_key: reaction,
      },
    );

    if (error) {
      setErrorMessage(error.message || "Reaction could not be saved.");
      setIsSaving(false);
      return;
    }

    await load();
    setIsSaving(false);
  }

  return (
    <section className="mt-5 rounded-[24px] border border-violet-200/12 bg-violet-300/[0.035] p-5">
      <p className="text-[8px] font-black uppercase tracking-[0.14em] text-violet-100/58">
        Safe Club Reactions
      </p>
      <h3 className="mt-1 text-xl font-black">
        What did you think?
      </h3>
      <p className="mt-2 text-[10px] leading-5 text-white/34">
        Choose one reaction. Creator Clubs do not use open comments here.
      </p>

      {errorMessage && (
        <p className="mt-3 rounded-xl border border-red-200/12 bg-red-400/[0.05] px-3 py-2 text-[9px] text-red-100">
          {errorMessage}
        </p>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {REACTIONS.map((reaction) => {
          const selected = payload.my_reaction === reaction.key;
          const count = Number(payload.counts[reaction.key] || 0);

          return (
            <button
              key={reaction.key}
              type="button"
              disabled={isSaving}
              onClick={() => void choose(reaction.key)}
              className={`min-h-[72px] rounded-[18px] border px-3 py-3 text-left transition disabled:opacity-45 ${
                selected
                  ? "border-violet-200/28 bg-violet-300/[0.09]"
                  : "border-white/8 bg-black/14 hover:border-white/16"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-lg text-violet-100">
                  {reaction.icon}
                </span>
                <span className="text-[9px] font-black text-white/28">
                  {count}
                </span>
              </div>
              <strong className="mt-2 block text-[9px] leading-4 text-white/72">
                {reaction.label}
              </strong>
            </button>
          );
        })}
      </div>
    </section>
  );
}
