import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BillingCycle = "monthly" | "annual";
type PlanCode = "science" | "core" | "complete";

type PlanDefinition = {
  planCode: PlanCode;
  billingCycle: BillingCycle;
};

const SKU_MAP: Record<string, PlanDefinition> = {
  "DS-SCI-M": { planCode: "science", billingCycle: "monthly" },
  "DS-SCI-A": { planCode: "science", billingCycle: "annual" },
  "DS-CORE-M": { planCode: "core", billingCycle: "monthly" },
  "DS-CORE-A": { planCode: "core", billingCycle: "annual" },
  "DS-COMPLETE-M": {
    planCode: "complete",
    billingCycle: "monthly",
  },
  "DS-COMPLETE-A": {
    planCode: "complete",
    billingCycle: "annual",
  },
};

type ShopifyProperty = {
  name?: string | null;
  value?: string | null;
};

type ShopifyLineItem = {
  id: number | string;
  sku?: string | null;
  title?: string | null;
  quantity?: number | null;
  properties?: ShopifyProperty[] | null;
};

type ShopifyOrder = {
  id: number | string;
  order_number?: number | string | null;
  name?: string | null;
  financial_status?: string | null;
  test?: boolean | null;
  created_at?: string | null;
  processed_at?: string | null;
  customer?: {
    id?: number | string | null;
    email?: string | null;
  } | null;
  email?: string | null;
  contact_email?: string | null;
  line_items?: ShopifyLineItem[] | null;
};

function normaliseEmail(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function getProperty(
  properties: ShopifyProperty[] | null | undefined,
  propertyName: string,
) {
  const match = (properties || []).find(
    (property) =>
      String(property.name || "").trim().toLowerCase() ===
      propertyName.toLowerCase(),
  );

  return String(match?.value || "").trim();
}

function verifyShopifyHmac(rawBody: string, receivedHmac: string) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("SHOPIFY_WEBHOOK_SECRET is not configured.");
  }

  const expectedHmac = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  const expected = Buffer.from(expectedHmac, "utf8");
  const received = Buffer.from(receivedHmac, "utf8");

  return (
    expected.length === received.length &&
    timingSafeEqual(expected, received)
  );
}

function addCalendarMonths(date: Date, months: number) {
  const result = new Date(date);
  const originalDay = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);

  const lastDayOfTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();

  result.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
  return result;
}

function addCalendarYears(date: Date, years: number) {
  const result = new Date(date);
  const originalMonth = result.getUTCMonth();
  const originalDay = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  result.setUTCMonth(originalMonth);

  const lastDayOfTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), originalMonth + 1, 0),
  ).getUTCDate();

  result.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
  return result;
}

function addBillingPeriod(date: Date, cycle: BillingCycle) {
  return cycle === "annual"
    ? addCalendarYears(date, 1)
    : addCalendarMonths(date, 1);
}

async function findAuthUserByEmail(email: string): Promise<User | null> {
  for (let page = 1; page <= 20; page += 1) {
    const {
      data: { users },
      error,
    } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw new Error(`Could not search Supabase users: ${error.message}`);
    }

    const match = users.find(
      (user) => normaliseEmail(user.email) === email,
    );

    if (match) return match;
    if (users.length < 1000) break;
  }

  return null;
}

async function getOrInviteLearner(
  learnerEmail: string,
  learnerName: string,
) {
  const existingUser = await findAuthUserByEmail(learnerEmail);

  if (existingUser) {
    return existingUser;
  }

  const redirectTo =
    process.env.DREAMSCAPE_INVITE_REDIRECT_URL ||
    (process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/profile`
      : undefined);

  const { data, error } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(
      learnerEmail,
      {
        data: {
          full_name: learnerName || undefined,
          account_source: "shopify-paid-subscription",
        },
        ...(redirectTo ? { redirectTo } : {}),
      },
    );

  if (error) {
    // A concurrent webhook may have created the account first.
    const retryUser = await findAuthUserByEmail(learnerEmail);

    if (retryUser) return retryUser;

    throw new Error(
      `Could not create/invite learner account: ${error.message}`,
    );
  }

  if (!data.user) {
    throw new Error("Supabase did not return the invited learner.");
  }

  return data.user;
}

async function ensureStudentProfile(
  userId: string,
  learnerName: string,
) {
  const { data: existingProfile, error: profileError } =
    await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

  if (profileError) {
    throw new Error(
      `Could not read learner profile: ${profileError.message}`,
    );
  }

  const currentRole = String(existingProfile?.role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");

  const protectedRoles = new Set([
    "admin",
    "teacher",
    "curriculum-lead",
  ]);

  if (existingProfile) {
    if (!protectedRoles.has(currentRole) && currentRole !== "student") {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ role: "student" })
        .eq("id", userId);

      if (error) {
        throw new Error(
          `Could not activate learner profile: ${error.message}`,
        );
      }
    }

    return;
  }

  const { error: insertError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: userId,
      role: "student",
      ...(learnerName ? { full_name: learnerName } : {}),
    });

  if (insertError) {
    // Some profile tables do not contain full_name. Retry with the
    // minimum fields used by the existing Dreamscape code.
    const { error: minimumInsertError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        role: "student",
      });

    if (minimumInsertError) {
      throw new Error(
        `Could not create learner profile: ${minimumInsertError.message}`,
      );
    }
  }
}

async function recoverLearnerFromPreviousPayment(
  customerId: string,
  sku: string,
) {
  if (!customerId) return null;

  const { data, error } = await supabaseAdmin
    .from("nova_subscriptions")
    .select("user_id,learner_email,learner_name")
    .eq("shopify_customer_id", customerId)
    .eq("shopify_sku", sku)
    .not("learner_email", "is", null)
    .order("paid_at", { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(
      `Could not recover renewal learner details: ${error.message}`,
    );
  }

  const uniqueEmails = Array.from(
    new Set(
      (data || [])
        .map((row) => normaliseEmail(row.learner_email))
        .filter(Boolean),
    ),
  );

  if (uniqueEmails.length !== 1) {
    return null;
  }

  const matchingRow = (data || []).find(
    (row) =>
      normaliseEmail(row.learner_email) === uniqueEmails[0],
  );

  return matchingRow
    ? {
        userId: String(matchingRow.user_id),
        learnerEmail: uniqueEmails[0],
        learnerName: String(matchingRow.learner_name || ""),
      }
    : null;
}

async function recordPaidAccess({
  order,
  lineItem,
  plan,
  webhookId,
}: {
  order: ShopifyOrder;
  lineItem: ShopifyLineItem;
  plan: PlanDefinition;
  webhookId: string;
}) {
  const orderId = String(order.id);
  const lineItemId = String(lineItem.id);
  const customerId = String(order.customer?.id || "");
  const sku = String(lineItem.sku || "").trim().toUpperCase();

  const { data: existingAccess, error: existingAccessError } =
    await supabaseAdmin
      .from("nova_subscriptions")
      .select("id")
      .eq("shopify_order_id", orderId)
      .eq("shopify_line_item_id", lineItemId)
      .maybeSingle();

  if (existingAccessError) {
    throw new Error(
      `Could not check existing paid access: ${existingAccessError.message}`,
    );
  }

  if (existingAccess) {
    return { result: "duplicate-line" as const };
  }

  let learnerName = getProperty(
    lineItem.properties,
    "Learner full name",
  );

  let learnerEmail = normaliseEmail(
    getProperty(
      lineItem.properties,
      "Learner Dreamscape email",
    ),
  );

  const authorisedValue = getProperty(
    lineItem.properties,
    "Parent or guardian authorised",
  );

  let learnerUserId = "";

  if (!learnerEmail) {
    const recovered = await recoverLearnerFromPreviousPayment(
      customerId,
      sku,
    );

    if (!recovered) {
      throw new Error(
        `Order ${orderId}, SKU ${sku}: learner email is missing and the renewal could not be matched safely.`,
      );
    }

    learnerEmail = recovered.learnerEmail;
    learnerName = learnerName || recovered.learnerName;
    learnerUserId = recovered.userId;
  } else if (
    authorisedValue &&
    !["yes", "true", "1", "authorised", "authorized"].includes(
      authorisedValue.toLowerCase(),
    )
  ) {
    throw new Error(
      `Order ${orderId}, SKU ${sku}: parent/guardian authorisation was not confirmed.`,
    );
  }

  if (!learnerUserId) {
    const learner = await getOrInviteLearner(
      learnerEmail,
      learnerName,
    );
    learnerUserId = learner.id;
  }

  await ensureStudentProfile(learnerUserId, learnerName);

  const paidAt = new Date(
    order.processed_at || order.created_at || Date.now(),
  );

  const safePaidAt = Number.isFinite(paidAt.getTime())
    ? paidAt
    : new Date();

  const { data: previousRows, error: previousRowsError } =
    await supabaseAdmin
      .from("nova_subscriptions")
      .select("access_until")
      .eq("user_id", learnerUserId)
      .eq("plan_code", plan.planCode)
      .eq("status", "active")
      .order("access_until", { ascending: false })
      .limit(20);

  if (previousRowsError) {
    throw new Error(
      `Could not read existing access: ${previousRowsError.message}`,
    );
  }

  const latestAccessUntil = (previousRows || [])
    .map((row) => new Date(String(row.access_until || "")).getTime())
    .filter(Number.isFinite)
    .reduce((latest, value) => Math.max(latest, value), 0);

  const baseTime = Math.max(
    safePaidAt.getTime(),
    Date.now(),
    latestAccessUntil,
  );

  const accessStartedAt = new Date(baseTime);
  const accessUntil = addBillingPeriod(
    accessStartedAt,
    plan.billingCycle,
  );

  const { error: insertError } = await supabaseAdmin
    .from("nova_subscriptions")
    .insert({
      user_id: learnerUserId,
      status: "active",
      plan_code: plan.planCode,
      billing_cycle: plan.billingCycle,
      source: "shopify",
      learner_email: learnerEmail,
      learner_name: learnerName || null,
      shopify_order_id: orderId,
      shopify_order_number: String(
        order.order_number || order.name || "",
      ),
      shopify_line_item_id: lineItemId,
      shopify_customer_id: customerId || null,
      shopify_sku: sku,
      shopify_webhook_id: webhookId,
      paid_at: safePaidAt.toISOString(),
      access_started_at: accessStartedAt.toISOString(),
      access_until: accessUntil.toISOString(),
      is_test: Boolean(order.test),
      updated_at: new Date().toISOString(),
    });

  if (insertError) {
    if (insertError.code === "23505") {
      return { result: "duplicate-line" as const };
    }

    throw new Error(
      `Could not activate paid access: ${insertError.message}`,
    );
  }

  return {
    result: "activated" as const,
    learnerEmail,
    planCode: plan.planCode,
    billingCycle: plan.billingCycle,
    accessUntil: accessUntil.toISOString(),
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const receivedHmac =
    request.headers.get("x-shopify-hmac-sha256") || "";
  const webhookId =
    request.headers.get("x-shopify-webhook-id") || "";
  const topic = request.headers.get("x-shopify-topic") || "";
  const shopDomain =
    request.headers.get("x-shopify-shop-domain") || "";

  if (!receivedHmac || !verifyShopifyHmac(rawBody, receivedHmac)) {
    return NextResponse.json(
      { ok: false, error: "Invalid Shopify signature." },
      { status: 401 },
    );
  }

  if (!webhookId) {
    return NextResponse.json(
      { ok: false, error: "Missing Shopify webhook ID." },
      { status: 400 },
    );
  }

  const expectedShop = String(
    process.env.SHOPIFY_STORE_DOMAIN || "",
  )
    .trim()
    .toLowerCase();

  if (
    expectedShop &&
    shopDomain.trim().toLowerCase() !== expectedShop
  ) {
    return NextResponse.json(
      { ok: false, error: "Unexpected Shopify store." },
      { status: 401 },
    );
  }

  if (topic && topic !== "orders/paid") {
    return NextResponse.json(
      { ok: true, ignored: true, reason: `Unexpected topic: ${topic}` },
      { status: 200 },
    );
  }

  const { data: existingEvent } = await supabaseAdmin
    .from("shopify_webhook_events")
    .select("status")
    .eq("webhook_id", webhookId)
    .maybeSingle();

  if (existingEvent?.status === "processed") {
    return NextResponse.json({
      ok: true,
      duplicate: true,
    });
  }

  await supabaseAdmin
    .from("shopify_webhook_events")
    .upsert(
      {
        webhook_id: webhookId,
        topic: topic || "orders/paid",
        shop_domain: shopDomain || null,
        status: "processing",
        received_at: new Date().toISOString(),
        error_message: null,
      },
      { onConflict: "webhook_id" },
    );

  try {
    const order = JSON.parse(rawBody) as ShopifyOrder;
    const financialStatus = String(
      order.financial_status || "",
    ).toLowerCase();

    if (financialStatus && financialStatus !== "paid") {
      await supabaseAdmin
        .from("shopify_webhook_events")
        .update({
          status: "ignored",
          order_id: String(order.id || ""),
          processed_at: new Date().toISOString(),
          error_message: `financial_status=${financialStatus}`,
        })
        .eq("webhook_id", webhookId);

      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "Order is not paid.",
      });
    }

    const recognisedLines = (order.line_items || [])
      .map((lineItem) => {
        const sku = String(lineItem.sku || "")
          .trim()
          .toUpperCase();

        return {
          lineItem,
          plan: SKU_MAP[sku],
        };
      })
      .filter(
        (
          item,
        ): item is {
          lineItem: ShopifyLineItem;
          plan: PlanDefinition;
        } => Boolean(item.plan),
      );

    if (recognisedLines.length === 0) {
      await supabaseAdmin
        .from("shopify_webhook_events")
        .update({
          status: "ignored",
          order_id: String(order.id || ""),
          processed_at: new Date().toISOString(),
          error_message: "No recognised Dreamscape SKU.",
        })
        .eq("webhook_id", webhookId);

      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "No recognised Dreamscape SKU.",
      });
    }

    const results = [];

    for (const item of recognisedLines) {
      results.push(
        await recordPaidAccess({
          order,
          lineItem: item.lineItem,
          plan: item.plan,
          webhookId,
        }),
      );
    }

    await supabaseAdmin
      .from("shopify_webhook_events")
      .update({
        status: "processed",
        order_id: String(order.id || ""),
        processed_at: new Date().toISOString(),
        result_json: results,
      })
      .eq("webhook_id", webhookId);

    return NextResponse.json({
      ok: true,
      orderId: String(order.id),
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown webhook error.";

    await supabaseAdmin
      .from("shopify_webhook_events")
      .update({
        status: "failed",
        processed_at: new Date().toISOString(),
        error_message: message,
      })
      .eq("webhook_id", webhookId);

    console.error("Shopify orders/paid webhook failed:", message);

    // A non-2xx response asks Shopify to retry the delivery.
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
