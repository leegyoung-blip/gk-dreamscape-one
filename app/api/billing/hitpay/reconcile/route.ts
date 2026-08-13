import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  reconcileGkpHitPayPayment,
} from "@/lib/gkp-hitpay-reconciliation";
import {
  isHitPayEnvironment,
  type HitPayEnvironment,
} from "@/lib/hitpay";

export const runtime = "nodejs";
export const dynamic =
  "force-dynamic";

function json(
  body: unknown,
  status = 200,
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function readableError(
  error: unknown,
) {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object"
  ) {
    const value =
      error as {
        message?: unknown;
        details?: unknown;
        hint?: unknown;
        code?: unknown;
      };

    const parts = [
      typeof value.message ===
        "string"
        ? value.message
        : "",
      typeof value.details ===
          "string" &&
        value.details
        ? `Details: ${value.details}`
        : "",
      typeof value.hint ===
          "string" &&
        value.hint
        ? `Hint: ${value.hint}`
        : "",
      typeof value.code ===
          "string" &&
        value.code
        ? `Code: ${value.code}`
        : "",
    ].filter(Boolean);

    if (parts.length) {
      return parts.join(" | ");
    }

    try {
      return JSON.stringify(
        error,
      );
    } catch {
      return "Unknown server error.";
    }
  }

  return String(error);
}

async function requireBillingStaff(
  request: Request,
) {
  const authHeader =
    request.headers.get(
      "authorization",
    ) || "";

  const token =
    authHeader.startsWith(
      "Bearer ",
    )
      ? authHeader
          .slice(7)
          .trim()
      : "";

  if (!token) {
    throw new Error(
      "AUTH_REQUIRED",
    );
  }

  const url =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const key =
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env
      .SUPABASE_ANON_KEY ||
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env
      .SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_AUTH_CONFIG_MISSING",
    );
  }

  const client =
    createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      },
    });

  const {
    data: { user },
    error: userError,
  } =
    await client.auth.getUser(
      token,
    );

  if (
    userError ||
    !user
  ) {
    throw new Error(
      "AUTH_REQUIRED",
    );
  }

  const {
    data: allowed,
    error:
      permissionError,
  } = await client.rpc(
    "gkp_is_billing_staff",
  );

  if (permissionError) {
    throw permissionError;
  }

  if (!allowed) {
    throw new Error(
      "ACCESS_DENIED",
    );
  }

  return user;
}

export async function POST(
  request: Request,
) {
  try {
    const staff =
      await requireBillingStaff(
        request,
      );

    const body =
      (await request.json()) as {
        paymentRequestId?:
          string;
      };

    const paymentRequestId =
      String(
        body.paymentRequestId ||
          "",
      ).trim();

    if (!paymentRequestId) {
      return json(
        {
          error:
            "paymentRequestId is required.",
        },
        400,
      );
    }

    /*
     * Derive the HitPay environment from our own stored
     * payment-request record. Do not trust a client-supplied
     * environment for a financial reconciliation.
     */
    const {
      data: localRequest,
      error:
        localRequestError,
    } = await supabaseAdmin
      .from(
        "gkp_billing_payment_requests",
      )
      .select(
        "id,environment,provider_request_id",
      )
      .eq(
        "provider",
        "hitpay",
      )
      .eq(
        "provider_request_id",
        paymentRequestId,
      )
      .maybeSingle();

    if (
      localRequestError
    ) {
      throw localRequestError;
    }

    if (!localRequest) {
      return json(
        {
          error:
            "No local GKP HitPay payment request matches this ID.",
        },
        404,
      );
    }

    const rawEnvironment =
      String(
        localRequest.environment ||
          "",
      )
        .trim()
        .toLowerCase();

    if (
      !isHitPayEnvironment(
        rawEnvironment,
      )
    ) {
      return json(
        {
          error:
            "The stored HitPay payment request has an invalid environment.",
        },
        409,
      );
    }

    const environment =
      rawEnvironment as HitPayEnvironment;

    const result =
      await reconcileGkpHitPayPayment(
        {
          environment,
          providerRequestId:
            paymentRequestId,
          source:
            "manual_reconcile",
          actorUserId:
            staff.id,
        },
      );

    if (
      result.status ===
      "needs_attention"
    ) {
      return json(
        result,
        409,
      );
    }

    return json(result);
  } catch (error) {
    const message =
      readableError(error);

    if (
      message ===
      "AUTH_REQUIRED"
    ) {
      return json(
        {
          error:
            "Please sign in again.",
        },
        401,
      );
    }

    if (
      message ===
      "ACCESS_DENIED"
    ) {
      return json(
        {
          error:
            "Billing staff access required.",
        },
        403,
      );
    }

    console.error(
      "GKP HitPay reconciliation failed",
      {
        message,
        rawError: error,
      },
    );

    return json(
      {
        error: message,
      },
      500,
    );
  }
}
