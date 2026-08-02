import "server-only";

import { supabaseAdmin } from "@/lib/supabase-admin";

type PlanCode = "science" | "core" | "complete";

type SubscriptionRow = {
  id: string;
  user_id: string;
  plan_code: PlanCode | null;
  source: string | null;
  status: string | null;
  access_until: string | null;
  access_until_before_revoke: string | null;
  shopify_line_item_id: string | null;
  revoke_reason: string | null;
  shopify_dispute_id: string | null;
};

type AccessKey = {
  userId: string;
  planCode: PlanCode;
};

function isPlanCode(value: string | null): value is PlanCode {
  return (
    value === "science" ||
    value === "core" ||
    value === "complete"
  );
}

function uniqueAccessKeys(rows: SubscriptionRow[]) {
  const seen = new Set<string>();
  const result: AccessKey[] = [];

  for (const row of rows) {
    if (!isPlanCode(row.plan_code)) continue;

    const key = `${row.user_id}:${row.plan_code}`;

    if (!seen.has(key)) {
      seen.add(key);
      result.push({
        userId: row.user_id,
        planCode: row.plan_code,
      });
    }
  }

  return result;
}

async function getOrderRows(
  orderId: string,
  lineItemIds?: string[],
) {
  let query = supabaseAdmin
    .from("nova_subscriptions")
    .select(
      "id,user_id,plan_code,source,status,access_until,access_until_before_revoke,shopify_line_item_id,revoke_reason,shopify_dispute_id",
    )
    .eq("shopify_order_id", orderId)
    .eq("source", "shopify");

  if (lineItemIds && lineItemIds.length > 0) {
    query = query.in("shopify_line_item_id", lineItemIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Could not find Shopify access for order ${orderId}: ${error.message}`,
    );
  }

  return (data || []) as SubscriptionRow[];
}

async function getActiveRowsForAccessKey(
  key: AccessKey,
) {
  const { data, error } = await supabaseAdmin
    .from("nova_subscriptions")
    .select(
      "id,user_id,plan_code,source,status,access_until,access_until_before_revoke,shopify_line_item_id,revoke_reason,shopify_dispute_id",
    )
    .eq("user_id", key.userId)
    .eq("plan_code", key.planCode)
    .eq("source", "shopify")
    .eq("status", "active");

  if (error) {
    throw new Error(
      `Could not load active ${key.planCode} access: ${error.message}`,
    );
  }

  return (data || []) as SubscriptionRow[];
}

export async function revokeShopifyAccessForOrder({
  orderId,
  lineItemIds,
  reason,
  refundId,
  disputeId,
  disputeStatus,
}: {
  orderId: string;
  lineItemIds?: string[];
  reason: "refund" | "chargeback";
  refundId?: string;
  disputeId?: string;
  disputeStatus?: string;
}) {
  const orderRows = await getOrderRows(orderId, lineItemIds);

  if (orderRows.length === 0) {
    return {
      affectedPlans: 0,
      revokedRows: 0,
      ignored: true,
      reason: "No Dreamscape Shopify access matched this order.",
    };
  }

  const keys = uniqueAccessKeys(orderRows);
  const now = new Date().toISOString();
  let revokedRows = 0;

  for (const key of keys) {
    const activeRows = await getActiveRowsForAccessKey(key);

    for (const row of activeRows) {
      const restoreUntil =
        row.access_until_before_revoke || row.access_until;

      const { error } = await supabaseAdmin
        .from("nova_subscriptions")
        .update({
          status: reason === "refund" ? "refunded" : "chargeback",
          access_until_before_revoke: restoreUntil,
          access_until: now,
          revoked_at: now,
          revoke_reason: reason,
          cancel_at_period_end: false,
          ...(refundId
            ? { shopify_refund_id: refundId }
            : {}),
          ...(disputeId
            ? { shopify_dispute_id: disputeId }
            : {}),
          ...(disputeStatus
            ? { shopify_dispute_status: disputeStatus }
            : {}),
          updated_at: now,
        })
        .eq("id", row.id);

      if (error) {
        throw new Error(
          `Could not revoke ${key.planCode} access: ${error.message}`,
        );
      }

      revokedRows += 1;
    }
  }

  return {
    affectedPlans: keys.length,
    revokedRows,
    ignored: false,
  };
}

export async function markOrderCancelledAtPeriodEnd({
  orderId,
  cancelledAt,
}: {
  orderId: string;
  cancelledAt?: string | null;
}) {
  const orderRows = await getOrderRows(orderId);

  if (orderRows.length === 0) {
    return {
      affectedPlans: 0,
      updatedRows: 0,
      ignored: true,
      reason: "No Dreamscape Shopify access matched this order.",
    };
  }

  const keys = uniqueAccessKeys(orderRows);
  const cancellationTime =
    cancelledAt && Number.isFinite(new Date(cancelledAt).getTime())
      ? new Date(cancelledAt).toISOString()
      : new Date().toISOString();

  let updatedRows = 0;

  for (const key of keys) {
    const { data, error } = await supabaseAdmin
      .from("nova_subscriptions")
      .update({
        cancel_at_period_end: true,
        cancellation_requested_at: cancellationTime,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", key.userId)
      .eq("plan_code", key.planCode)
      .eq("source", "shopify")
      .eq("status", "active")
      .select("id");

    if (error) {
      throw new Error(
        `Could not mark ${key.planCode} for period-end cancellation: ${error.message}`,
      );
    }

    updatedRows += data?.length || 0;
  }

  return {
    affectedPlans: keys.length,
    updatedRows,
    ignored: false,
  };
}

export async function restoreWonChargeback({
  orderId,
  disputeId,
}: {
  orderId: string;
  disputeId: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("nova_subscriptions")
    .select(
      "id,user_id,plan_code,source,status,access_until,access_until_before_revoke,shopify_line_item_id,revoke_reason,shopify_dispute_id",
    )
    .eq("source", "shopify")
    .eq("shopify_dispute_id", disputeId)
    .eq("revoke_reason", "chargeback");

  if (error) {
    throw new Error(
      `Could not load disputed access: ${error.message}`,
    );
  }

  const rows = (data || []) as SubscriptionRow[];

  if (rows.length === 0) {
    return {
      restoredRows: 0,
      expiredRows: 0,
      ignored: true,
      reason: `No chargeback-revoked access matched dispute ${disputeId}.`,
    };
  }

  const now = Date.now();
  let restoredRows = 0;
  let expiredRows = 0;

  for (const row of rows) {
    const restoreUntil = row.access_until_before_revoke
      ? new Date(row.access_until_before_revoke)
      : null;

    const restoreIsFuture =
      restoreUntil &&
      Number.isFinite(restoreUntil.getTime()) &&
      restoreUntil.getTime() > now;

    const { error: updateError } = await supabaseAdmin
      .from("nova_subscriptions")
      .update({
        status: restoreIsFuture ? "active" : "expired",
        access_until: restoreIsFuture
          ? restoreUntil.toISOString()
          : new Date().toISOString(),
        revoked_at: null,
        revoke_reason: null,
        shopify_dispute_status: "won",
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (updateError) {
      throw new Error(
        `Could not restore won chargeback access: ${updateError.message}`,
      );
    }

    if (restoreIsFuture) {
      restoredRows += 1;
    } else {
      expiredRows += 1;
    }
  }

  return {
    restoredRows,
    expiredRows,
    ignored: false,
    orderId,
  };
}

export async function updateDisputeStatus({
  disputeId,
  status,
}: {
  disputeId: string;
  status: string;
}) {
  const { error } = await supabaseAdmin
    .from("nova_subscriptions")
    .update({
      shopify_dispute_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq("shopify_dispute_id", disputeId);

  if (error) {
    throw new Error(
      `Could not update dispute status: ${error.message}`,
    );
  }
}
