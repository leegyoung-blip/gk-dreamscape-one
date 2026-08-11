import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  deleteHitPayPaymentRequest,
  getHitPayPaymentRequest,
  isHitPayEnvironment,
  type HitPayEnvironment,
} from "@/lib/hitpay";
import { createBillingServiceClient } from "@/lib/gkpBillingServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TERMINAL_STATUSES = new Set([
  "failed",
  "expired",
  "canceled",
  "inactive",
]);

type PaymentRequestRow = {
  id: string;
  invoice_id: string;
  environment: string;
  provider_request_id: string;
  provider_status: string;
  requested_amount: number | string;
  currency: string;
  qr_expires_at: string | null;
  reuse_until: string | null;
  is_current: boolean;
  provider_status_checked_at: string | null;
  cancelled_at: string | null;
  created_at: string;
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function requireBillingStaff(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) throw new Error("AUTH_REQUIRED");

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publicKey) {
    throw new Error("SUPABASE_AUTH_CONFIG_MISSING");
  }

  const client = createClient(url, publicKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser(token);

  if (userError || !user) throw new Error("AUTH_REQUIRED");

  const { data: allowed, error: accessError } = await client.rpc(
    "gkp_is_billing_staff",
  );

  if (accessError || !allowed) throw new Error("ACCESS_DENIED");

  return user;
}

async function markTerminal(input: {
  id: string;
  status: string;
  rawResponse: Record<string, unknown>;
  actorUserId?: string | null;
}) {
  const client = createBillingServiceClient();
  const { error } = await client.rpc(
    "gkp_mark_hitpay_payment_request_terminal",
    {
      p_payment_request_id: input.id,
      p_provider_status: input.status,
      p_raw_status_response: input.rawResponse,
      p_actor_user_id: input.actorUserId || null,
    },
  );

  if (error) throw error;
}

async function reconcilePendingRequests() {
  const client = createBillingServiceClient();

  const { data, error } = await client
    .from("gkp_billing_payment_requests")
    .select(
      "id,invoice_id,environment,provider_request_id,provider_status,requested_amount,currency,qr_expires_at,reuse_until,is_current,provider_status_checked_at,cancelled_at,created_at",
    )
    .eq("provider", "hitpay")
    .eq("provider_status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  const observed = new Map<string, string>();

  await Promise.all(
    ((data || []) as PaymentRequestRow[]).map(async (row) => {
      if (!isHitPayEnvironment(row.environment)) {
        observed.set(row.id, "invalid_environment");
        return;
      }

      try {
        const providerRequest = await getHitPayPaymentRequest(
          row.environment,
          row.provider_request_id,
        );
        const status = String(providerRequest.status || "")
          .trim()
          .toLowerCase();

        observed.set(row.id, status || "unknown");

        if (TERMINAL_STATUSES.has(status)) {
          await markTerminal({
            id: row.id,
            status,
            rawResponse: providerRequest,
          });
        }
      } catch (error) {
        console.warn(
          "Could not reconcile HitPay payment request",
          row.provider_request_id,
          error,
        );
        observed.set(row.id, "unavailable");
      }
    }),
  );

  return observed;
}

async function loadRows(observed: Map<string, string>) {
  const client = createBillingServiceClient();

  const [activeResult, closedResult] = await Promise.all([
    client
      .from("gkp_billing_payment_requests")
      .select(
        "id,invoice_id,environment,provider_request_id,provider_status,requested_amount,currency,qr_expires_at,reuse_until,is_current,provider_status_checked_at,cancelled_at,created_at",
      )
      .eq("provider", "hitpay")
      .eq("provider_status", "pending")
      .order("created_at", { ascending: false }),
    client
      .from("gkp_billing_payment_requests")
      .select(
        "id,invoice_id,environment,provider_request_id,provider_status,requested_amount,currency,qr_expires_at,reuse_until,is_current,provider_status_checked_at,cancelled_at,created_at",
      )
      .eq("provider", "hitpay")
      .in("provider_status", ["canceled", "expired", "failed", "inactive"])
      .order("updated_at", { ascending: false })
      .limit(30),
  ]);

  if (activeResult.error) throw activeResult.error;
  if (closedResult.error) throw closedResult.error;

  const rows = [
    ...((activeResult.data || []) as PaymentRequestRow[]),
    ...((closedResult.data || []) as PaymentRequestRow[]),
  ];
  const invoiceIds = Array.from(new Set(rows.map((row) => row.invoice_id)));

  const invoiceResult = invoiceIds.length
    ? await client
        .from("gkp_billing_invoice_admin_overview")
        .select(
          "id,invoice_number,account_code,payer_name,billing_email,status,balance_due",
        )
        .in("id", invoiceIds)
    : { data: [], error: null };

  if (invoiceResult.error) throw invoiceResult.error;

  const invoiceMap = new Map(
    (invoiceResult.data || []).map((invoice) => [invoice.id, invoice]),
  );

  function decorate(row: PaymentRequestRow) {
    const invoice = invoiceMap.get(row.invoice_id);
    return {
      ...row,
      provider_observed_status:
        observed.get(row.id) || row.provider_status,
      invoice_number: invoice?.invoice_number || "Unknown invoice",
      account_code: invoice?.account_code || "",
      payer_name: invoice?.payer_name || "Unknown payer",
      billing_email: invoice?.billing_email || "",
      invoice_status: invoice?.status || "",
      invoice_balance_due: Number(invoice?.balance_due || 0),
    };
  }

  return {
    active: ((activeResult.data || []) as PaymentRequestRow[]).map(decorate),
    closed: ((closedResult.data || []) as PaymentRequestRow[]).map(decorate),
  };
}

export async function GET(request: Request) {
  try {
    await requireBillingStaff(request);
    const observed = await reconcilePendingRequests();
    const rows = await loadRows(observed);

    return json(rows);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load QR requests.";

    if (message === "AUTH_REQUIRED") {
      return json({ error: "Please sign in again." }, 401);
    }

    if (message === "ACCESS_DENIED") {
      return json({ error: "Billing staff access is required." }, 403);
    }

    console.error("HitPay admin QR request load failed", error);
    return json({ error: message }, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireBillingStaff(request);
    const body = (await request.json()) as {
      billingRequestId?: string;
    };
    const billingRequestId = String(body.billingRequestId || "").trim();

    if (!billingRequestId) {
      return json({ error: "billingRequestId is required." }, 400);
    }

    const client = createBillingServiceClient();
    const { data: row, error: requestError } = await client
      .from("gkp_billing_payment_requests")
      .select(
        "id,invoice_id,environment,provider_request_id,provider_status,requested_amount,currency,is_current",
      )
      .eq("id", billingRequestId)
      .eq("provider", "hitpay")
      .maybeSingle();

    if (requestError) throw requestError;
    if (!row) return json({ error: "QR request not found." }, 404);

    if (TERMINAL_STATUSES.has(String(row.provider_status).toLowerCase())) {
      return json({
        success: true,
        alreadyClosed: true,
        status: row.provider_status,
      });
    }

    const { count: successfulPaymentCount, error: paymentError } =
      await client
        .from("gkp_billing_payments")
        .select("id", { count: "exact", head: true })
        .eq("invoice_id", row.invoice_id)
        .eq("status", "succeeded");

    if (paymentError) throw paymentError;

    if ((successfulPaymentCount || 0) > 0) {
      return json(
        {
          error:
            "This invoice already has a successful payment and its QR request cannot be cancelled.",
        },
        409,
      );
    }

    if (!isHitPayEnvironment(row.environment)) {
      return json({ error: "Invalid HitPay environment on this request." }, 409);
    }

    const providerRequest = await getHitPayPaymentRequest(
      row.environment as HitPayEnvironment,
      row.provider_request_id,
    );
    const providerStatus = String(providerRequest.status || "")
      .trim()
      .toLowerCase();

    if (providerStatus === "completed") {
      return json(
        {
          error:
            "HitPay reports this request as completed. It cannot be cancelled. Refresh the invoice and allow the validated payment webhook to finish processing.",
        },
        409,
      );
    }

    if (TERMINAL_STATUSES.has(providerStatus)) {
      await markTerminal({
        id: row.id,
        status: providerStatus,
        rawResponse: providerRequest,
        actorUserId: user.id,
      });

      return json({
        success: true,
        alreadyClosed: true,
        status: providerStatus,
      });
    }

    if (providerStatus !== "pending") {
      return json(
        {
          error: `HitPay reports status "${providerStatus || "unknown"}". The request was not cancelled.`,
        },
        409,
      );
    }

    const deleteResponse = await deleteHitPayPaymentRequest(
      row.environment as HitPayEnvironment,
      row.provider_request_id,
    );

    await markTerminal({
      id: row.id,
      status: "canceled",
      rawResponse: {
        provider_status_before_delete: providerStatus,
        delete_response: deleteResponse,
      },
      actorUserId: user.id,
    });

    return json({
      success: true,
      status: "canceled",
      invoiceId: row.invoice_id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "QR request could not be cancelled.";

    if (message === "AUTH_REQUIRED") {
      return json({ error: "Please sign in again." }, 401);
    }

    if (message === "ACCESS_DENIED") {
      return json({ error: "Billing staff access is required." }, 403);
    }

    console.error("HitPay QR request cancellation failed", error);
    return json({ error: message }, 500);
  }
}
