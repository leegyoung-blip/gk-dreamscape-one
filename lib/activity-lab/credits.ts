import { supabase } from "@/lib/supabase";

export type ActivityLabCreditPack = {
  packKey: string;
  title: string;
  description: string | null;
  credits: number;
  priceCents: number;
  compareAtPriceCents: number | null;
  currency: string;
};

export type ActivityLabCreditState = {
  balanceCredits: number;
  lifetimePurchasedCredits: number;
  lifetimeRedeemedCredits: number;
};

export type ActivityLabCreditRedeemResult = {
  accepted: boolean;
  creditsSpent: number;
  boltsAdded: number;
  creditBalance: number;
  batteryBolts: number;
  bonusBolts: number;
  totalBolts: number;
};

export type ActivityLabCheckoutConfirmation = {
  ok: boolean;
  pending: boolean;
  applied: boolean;
  credits: number;
  paymentStatus: string;
  wallet: ActivityLabCreditState | null;
};

type CreditStateRow = {
  balance_credits: number;
  lifetime_purchased_credits: number;
  lifetime_redeemed_credits: number;
};

type CreditRedeemRow = {
  accepted: boolean;
  credits_spent: number;
  bolts_added: number;
  credit_balance: number;
  battery_bolts: number;
  bonus_bolts: number;
  total_bolts: number;
};

function firstRow<T>(data: T[] | T | null): T | null {
  return !data ? null : Array.isArray(data) ? (data[0] ?? null) : data;
}

async function accessToken() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please log in before purchasing Play Credits.");
  return token;
}

export async function getActivityLabCredits(): Promise<ActivityLabCreditState> {
  const { data, error } = await supabase.rpc("activity_lab_credits_get");
  if (error) throw error;

  const row = firstRow(data as CreditStateRow[] | CreditStateRow | null);
  if (!row) throw new Error("Play Credit wallet was not returned.");

  return {
    balanceCredits: Number(row.balance_credits ?? 0),
    lifetimePurchasedCredits: Number(row.lifetime_purchased_credits ?? 0),
    lifetimeRedeemedCredits: Number(row.lifetime_redeemed_credits ?? 0),
  };
}

export async function getActivityLabCreditPacks(): Promise<ActivityLabCreditPack[]> {
  const { data, error } = await supabase
    .from("activity_lab_credit_packs")
    .select("pack_key,title,description,credits,price_cents,compare_at_price_cents,currency,sort_order")
    .eq("enabled", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    packKey: String(row.pack_key),
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    credits: Number(row.credits ?? 0),
    priceCents: Number(row.price_cents ?? 0),
    compareAtPriceCents: row.compare_at_price_cents == null ? null : Number(row.compare_at_price_cents),
    currency: String(row.currency || "sgd"),
  }));
}

export async function redeemActivityLabCredits(
  credits: number,
  idempotencyKey: string,
): Promise<ActivityLabCreditRedeemResult> {
  const { data, error } = await supabase.rpc("activity_lab_credit_redeem", {
    p_credits: credits,
    p_idempotency_key: idempotencyKey,
  });

  if (error) throw error;

  const row = firstRow(data as CreditRedeemRow[] | CreditRedeemRow | null);
  if (!row) throw new Error("Play Credit redemption response was not returned.");

  return {
    accepted: Boolean(row.accepted),
    creditsSpent: Number(row.credits_spent ?? 0),
    boltsAdded: Number(row.bolts_added ?? 0),
    creditBalance: Number(row.credit_balance ?? 0),
    batteryBolts: Number(row.battery_bolts ?? 0),
    bonusBolts: Number(row.bonus_bolts ?? 0),
    totalBolts: Number(row.total_bolts ?? 0),
  };
}

export async function createActivityLabCreditCheckout(packKey: string): Promise<string> {
  const token = await accessToken();
  const response = await fetch("/api/activity-lab/credits/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ packKey }),
  });

  const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok || !body.url) throw new Error(body.error || "Could not start Play Credit checkout.");
  return body.url;
}

export async function confirmActivityLabCreditCheckout(sessionId: string): Promise<ActivityLabCheckoutConfirmation> {
  const token = await accessToken();
  const response = await fetch("/api/activity-lab/credits/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ sessionId }),
  });

  const body = (await response.json().catch(() => ({}))) as ActivityLabCheckoutConfirmation | { error?: string };
  if (response.status !== 202 && !response.ok) {
    throw new Error("error" in body && body.error ? body.error : "Could not confirm Play Credit checkout.");
  }
  return body as ActivityLabCheckoutConfirmation;
}

export function createCreditRedemptionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
