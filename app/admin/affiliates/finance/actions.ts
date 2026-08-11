"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/affiliate/auth";

const FINANCE_PATH = "/admin/affiliates/finance";

function financeUrl(
  type: "success" | "error",
  message: string,
) {
  return `${FINANCE_PATH}?${type}=${encodeURIComponent(message)}`;
}

function fail(message: string): never {
  redirect(financeUrl("error", message));
}

export async function verifyAffiliatePayoutProfile(
  formData: FormData,
) {
  const partnerId = String(
    formData.get("affiliate_partner_id") || "",
  ).trim();

  if (!partnerId) {
    fail("Affiliate partner is required.");
  }

  const { user, admin } = await requireAdmin();

  const { data: profile, error: profileError } =
    await admin
      .from("affiliate_payout_profiles")
      .select(
        "id,payout_method,payout_country,payee_name,paynow_proxy_type,paynow_proxy_last4",
      )
      .eq("affiliate_partner_id", partnerId)
      .maybeSingle();

  if (profileError) {
    fail(profileError.message);
  }

  if (!profile) {
    fail("This affiliate does not have a payout profile.");
  }

  const verifiedAt = new Date().toISOString();

  const { error } = await admin
    .from("affiliate_payout_profiles")
    .update({
      verified_at: verifiedAt,
      updated_at: verifiedAt,
    })
    .eq("id", profile.id);

  if (error) {
    fail(error.message);
  }

  await admin
    .from("affiliate_admin_audit_log")
    .insert({
      affiliate_partner_id: partnerId,
      actor_user_id: user.id,
      action: "affiliate_payout_profile_verified",
      details: {
        payout_method: profile.payout_method,
        payout_country: profile.payout_country,
        payee_name: profile.payee_name,
        paynow_proxy_type: profile.paynow_proxy_type,
        paynow_proxy_last4: profile.paynow_proxy_last4,
        verified_at: verifiedAt,
      },
    });

  revalidatePath(FINANCE_PATH);
  redirect(
    financeUrl(
      "success",
      "Payout profile verified.",
    ),
  );
}

export async function unverifyAffiliatePayoutProfile(
  formData: FormData,
) {
  const partnerId = String(
    formData.get("affiliate_partner_id") || "",
  ).trim();

  if (!partnerId) {
    fail("Affiliate partner is required.");
  }

  const { user, admin } = await requireAdmin();

  const { error } = await admin
    .from("affiliate_payout_profiles")
    .update({
      verified_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("affiliate_partner_id", partnerId);

  if (error) {
    fail(error.message);
  }

  await admin
    .from("affiliate_admin_audit_log")
    .insert({
      affiliate_partner_id: partnerId,
      actor_user_id: user.id,
      action: "affiliate_payout_profile_unverified",
    });

  revalidatePath(FINANCE_PATH);
  redirect(
    financeUrl(
      "success",
      "Payout profile returned to unverified status.",
    ),
  );
}

export async function createAffiliatePayoutBatch(
  formData: FormData,
) {
  const periodEnd = String(
    formData.get("period_end") || "",
  ).trim();

  const currency = String(
    formData.get("currency") || "SGD",
  )
    .trim()
    .toUpperCase();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) {
    fail("Enter a valid payout period date.");
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    fail("Enter a valid three-letter currency code.");
  }

  const { user, admin } = await requireAdmin();

  const { data, error } = await admin.rpc(
    "close_dreamscape_affiliate_payout_period",
    {
      p_period_end: periodEnd,
      p_currency: currency,
      p_created_by: user.id,
    },
  );

  if (error) {
    fail(error.message);
  }

  revalidatePath(FINANCE_PATH);

  redirect(
    financeUrl(
      "success",
      `Draft payout batch prepared${data ? ` (${data})` : ""}.`,
    ),
  );
}

export async function approveAffiliatePayoutBatch(
  formData: FormData,
) {
  const batchId = String(
    formData.get("batch_id") || "",
  ).trim();

  if (!batchId) {
    fail("Payout batch is required.");
  }

  const { user, admin } = await requireAdmin();

  const { error } = await admin.rpc(
    "approve_dreamscape_affiliate_payout_batch",
    {
      p_batch_id: batchId,
      p_actor_user_id: user.id,
    },
  );

  if (error) {
    fail(error.message);
  }

  revalidatePath(FINANCE_PATH);

  redirect(
    financeUrl(
      "success",
      "Payout batch approved.",
    ),
  );
}

export async function cancelAffiliatePayoutBatch(
  formData: FormData,
) {
  const batchId = String(
    formData.get("batch_id") || "",
  ).trim();

  const reason = String(
    formData.get("reason") || "",
  ).trim();

  if (!batchId) {
    fail("Payout batch is required.");
  }

  if (reason.length < 3) {
    fail("Enter a cancellation reason.");
  }

  const { user, admin } = await requireAdmin();

  const { error } = await admin.rpc(
    "cancel_dreamscape_affiliate_payout_batch",
    {
      p_batch_id: batchId,
      p_reason: reason,
      p_actor_user_id: user.id,
    },
  );

  if (error) {
    fail(error.message);
  }

  revalidatePath(FINANCE_PATH);

  redirect(
    financeUrl(
      "success",
      "Payout batch cancelled and its items returned to the unpaid pool.",
    ),
  );
}

export async function markAffiliatePayoutPaid(
  formData: FormData,
) {
  const payoutId = String(
    formData.get("payout_id") || "",
  ).trim();

  const reference = String(
    formData.get("payout_reference") || "",
  ).trim();

  if (!payoutId) {
    fail("Affiliate payout is required.");
  }

  if (reference.length < 2) {
    fail("Enter the payout transaction/reference number.");
  }

  const { user, admin } = await requireAdmin();

  const { error } = await admin.rpc(
    "mark_dreamscape_affiliate_payout_paid",
    {
      p_payout_id: payoutId,
      p_payout_reference: reference,
      p_actor_user_id: user.id,
    },
  );

  if (error) {
    fail(error.message);
  }

  revalidatePath(FINANCE_PATH);

  redirect(
    financeUrl(
      "success",
      "Affiliate payout marked as paid.",
    ),
  );
}

export async function createAffiliateFinanceAdjustment(
  formData: FormData,
) {
  const partnerId = String(
    formData.get("affiliate_partner_id") || "",
  ).trim();

  const rawAmount = Number(
    formData.get("amount") || 0,
  );

  const currency = String(
    formData.get("currency") || "SGD",
  )
    .trim()
    .toUpperCase();

  const reason = String(
    formData.get("reason") || "",
  ).trim();

  if (!partnerId) {
    fail("Affiliate partner is required.");
  }

  if (
    !Number.isFinite(rawAmount) ||
    Math.abs(rawAmount) < 0.005
  ) {
    fail("Adjustment amount cannot be zero.");
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    fail("Enter a valid three-letter currency code.");
  }

  if (reason.length < 3) {
    fail("Enter an adjustment reason.");
  }

  const { user, admin } = await requireAdmin();

  const { error } = await admin.rpc(
    "create_dreamscape_affiliate_adjustment",
    {
      p_affiliate_partner_id: partnerId,
      p_amount: rawAmount,
      p_currency: currency,
      p_reason: reason,
      p_created_by: user.id,
      p_contract_id: null,
      p_payment_id: null,
      p_commission_id: null,
    },
  );

  if (error) {
    fail(error.message);
  }

  revalidatePath(FINANCE_PATH);

  redirect(
    financeUrl(
      "success",
      "Affiliate finance adjustment recorded.",
    ),
  );
}
