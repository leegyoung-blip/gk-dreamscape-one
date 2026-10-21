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

/*
 * Error codes for failures that are not Supabase query errors. A missing or
 * invisible profile row (no profile yet, or blocked by RLS) and an unreadable
 * stored value are errors, never a silent 0, so pages can tell them apart from a
 * genuine zero balance.
 */
export const DT_BALANCE_PROFILE_NOT_FOUND = "DT_BALANCE_PROFILE_NOT_FOUND";
export const DT_BALANCE_INVALID_VALUE = "DT_BALANCE_INVALID_VALUE";

export type DreamTokenBalanceError = { message: string; code?: string };

export type DreamTokenBalanceResult = {
  /**
   * Current balance when error is null (a genuine 0 included). When error is
   * set this is 0, so pages that ignore the error behave as before.
   */
  data: number;
  error: DreamTokenBalanceError | null;
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

  if (!data) {
    return {
      data: 0,
      error: {
        code: DT_BALANCE_PROFILE_NOT_FOUND,
        message:
          "Dream Token balance unavailable: the signed-in learner's profile was not found or is not visible.",
      },
    };
  }

  // A profile with no stored balance yet is a genuine zero (no transactions).
  if (data.dream_token_balance === null || data.dream_token_balance === undefined) {
    return { data: 0, error: null };
  }

  const balance = Number(data.dream_token_balance);
  if (!Number.isFinite(balance)) {
    return {
      data: 0,
      error: {
        code: DT_BALANCE_INVALID_VALUE,
        message: "Dream Token balance unavailable: the stored balance is not a number.",
      },
    };
  }

  return { data: balance, error: null };
}
