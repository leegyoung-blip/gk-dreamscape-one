import { createHmac } from "node:crypto";
import { adminDb } from "./server";

/**
 * Safe adapter for your existing DT/DG ledger. No tokens are written directly to an
 * unknown schema. Configure an authenticated INTERNAL rewards endpoint which must
 * enforce idempotency using applicationId. Delivery is never reported before success.
 */
export async function deliverF50RewardGrant(applicationId: string) {
  const db = adminDb();
  const { data: grant, error } = await db.from("founding_50_reward_grants")
    .select("application_id,user_id,dream_tokens,dream_gems,status")
    .eq("application_id", applicationId).single();
  if (error || !grant) throw new Error("Reward grant unavailable");
  if (grant.status === "delivered") return { status: "delivered" as const };
  const url = process.env.FOUNDING50_REWARD_ADAPTER_URL;
  const secret = process.env.FOUNDING50_REWARD_ADAPTER_SECRET;
  if (!url || !secret) return { status: "pending" as const };
  if (!url.startsWith("https://")) throw new Error("Reward adapter must use HTTPS");
  const body = JSON.stringify({
    applicationId: grant.application_id, userId: grant.user_id,
    dreamTokens: grant.dream_tokens, dreamGems: grant.dream_gems,
    idempotencyKey: `founding50-reward-${grant.application_id}`,
  });
  const sig = createHmac("sha256", secret).update(body).digest("hex");
  const response = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json", "X-Founding50-Signature": sig },
    body, cache: "no-store",
  });
  if (!response.ok) throw new Error(`Reward adapter returned ${response.status}`);
  const { error: updateError } = await db.from("founding_50_reward_grants")
    .update({ status: "delivered", delivered_at: new Date().toISOString(), last_error: null,
      external_reference: `founding50-reward-${applicationId}` })
    .eq("application_id", applicationId).neq("status", "delivered");
  if (updateError) throw updateError;
  return { status: "delivered" as const };
}
