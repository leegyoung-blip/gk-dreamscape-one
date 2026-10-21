/*
 * Current Dream Token (virtual) balance for DISPLAY.
 *
 * Reads the signed-in learner's own profiles.dream_token_balance (RLS policy
 * auth.uid() = id), which the ledger's AFTER INSERT row trigger keeps in step
 * within the same transaction. A production reconciliation (PERF-2C-3) found
 * 0 of 120 profiles differing from the virtual-ledger sum that pages used to
 * compute in the browser, so this returns the same number without downloading
 * every ledger row.
 *
 * Use it only to show a balance. Game rules (reward caps, weekly limits),
 * Milo Bank calculations, statements, Exchange logs and transaction history
 * must keep reading dream_token_transactions directly.
 *
 * Reverting to the previous behaviour is a change to this file only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type DreamTokenBalanceResult = {
  /** Current balance; 0 when the learner has no balance yet (as before). */
  data: number;
  error: { message: string } | null;
};

export async function fetchDreamTokenBalance(
  client: SupabaseClient,
  userId: string,
): Promise<DreamTokenBalanceResult> {
  const { data, error } = await client
    .from("profiles")
    .select("dream_token_balance")
    .eq("id", userId)
    .maybeSingle();

  if (error) return { data: 0, error };

  const balance = Number(data?.dream_token_balance ?? 0);
  return { data: Number.isFinite(balance) ? balance : 0, error: null };
}
