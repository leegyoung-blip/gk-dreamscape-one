import { adminDb } from "./server";

export type Founding50BetaAccess = {
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  source: "founding50_beta" | null;
};

/**
 * This is the source of truth for Founding 50 beta access.
 * Call on the server with the authenticated account's user ID.
 * It does not check, alter or charge existing subscriptions.
 */
export async function getFounding50NovaPlusAccess(userId: string): Promise<Founding50BetaAccess> {
  if (!userId) throw new Error("Authenticated user ID required");
  const now = new Date().toISOString();
  const { data, error } = await adminDb()
    .from("founding_50_entitlements")
    .select("starts_at, ends_at")
    .eq("user_id", userId)
    .eq("product", "nova_plus_beta")
    .lte("starts_at", now)
    .gt("ends_at", now)
    .limit(1)
    .maybeSingle();

  // Fail with a server error rather than treating database failures as "no access".
  if (error) throw error;
  return data
    ? { active: true, startsAt: data.starts_at, endsAt: data.ends_at, source: "founding50_beta" }
    : { active: false, startsAt: null, endsAt: null, source: null };
}

/** Backwards-compatible helper from Phase 1C. */
export async function hasFounding50NovaPlusAccess(userId: string): Promise<boolean> {
  return (await getFounding50NovaPlusAccess(userId)).active;
}

/**
 * Adapter for EXISTING NOVA+ SERVER-SIDE gates. Preserve whatever paid, trial,
 * manual-grant and admin access logic the site already supports.
 * Use e.g.:
 *   const canEnter = await hasEffectiveNovaPlusAccess(user.id,
 *     () => yourExistingNovaPlusAccessCheck(user.id));
 *
 * Do not remove the existing check or grant permanent access.
 */
export async function hasEffectiveNovaPlusAccess(
  userId: string,
  existingNovaPlusAccess: () => Promise<boolean>,
): Promise<boolean> {
  // Existing subscribers need no beta lookup and are never downgraded.
  if (await existingNovaPlusAccess()) return true;
  return hasFounding50NovaPlusAccess(userId);
}
