import { adminDb } from "./server";

/** Call from server-side NOVA/NOVA+ entitlement checks; never trust client state. */
export async function hasFounding50NovaPlusAccess(userId: string): Promise<boolean> {
  const now = new Date().toISOString();
  const { data, error } = await adminDb()
    .from("founding_50_entitlements")
    .select("application_id")
    .eq("user_id", userId)
    .eq("product", "nova_plus_beta")
    .lte("starts_at", now)
    .gt("ends_at", now)
    .limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}
