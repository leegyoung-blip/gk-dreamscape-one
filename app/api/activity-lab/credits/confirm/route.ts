import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStripeEnvironment } from "@/lib/stripe";
import { retrieveAndApplyActivityLabStripeSession } from "@/lib/activity-lab/stripeCredits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ErrorInfo = {
  name: string;
  message: string;
  code: string;
  details: string;
  hint: string;
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function errorInfo(error: unknown): ErrorInfo {
  if (error instanceof Error) {
    const value = error as Error & {
      code?: unknown;
      details?: unknown;
      hint?: unknown;
    };

    return {
      name: value.name || "Error",
      message: value.message || "Unknown error",
      code: typeof value.code === "string" ? value.code : "",
      details: typeof value.details === "string" ? value.details : "",
      hint: typeof value.hint === "string" ? value.hint : "",
    };
  }

  if (error && typeof error === "object") {
    const value = error as {
      name?: unknown;
      message?: unknown;
      code?: unknown;
      details?: unknown;
      hint?: unknown;
    };

    return {
      name: typeof value.name === "string" ? value.name : "UnknownError",
      message:
        typeof value.message === "string" && value.message
          ? value.message
          : "Unknown error",
      code: typeof value.code === "string" ? value.code : "",
      details: typeof value.details === "string" ? value.details : "",
      hint: typeof value.hint === "string" ? value.hint : "",
    };
  }

  return {
    name: "UnknownError",
    message: String(error || "Unknown error"),
    code: "",
    details: "",
    hint: "",
  };
}

function isUserFacingValidationError(info: ErrorInfo) {
  const message = info.message.toLowerCase();

  return (
    message.includes("not an activity lab purchase") ||
    message.includes("environment does not match") ||
    message.includes("require a one-time stripe payment") ||
    message.includes("order id is missing") ||
    message.includes("belongs to another account") ||
    message.includes("user does not match") ||
    message.includes("session does not match") ||
    message.includes("currency does not match") ||
    message.includes("total does not match")
  );
}

function isDatabaseError(info: ErrorInfo) {
  return (
    info.code.startsWith("PGRST") ||
    /^[0-9A-Z]{5}$/.test(info.code) ||
    info.name.toLowerCase().includes("postgrest")
  );
}

async function requireUser(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) throw new Error("AUTH_REQUIRED");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) throw new Error("SUPABASE_AUTH_CONFIG_MISSING");

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);

  if (error || !user) throw new Error("AUTH_REQUIRED");
  return user;
}

export async function POST(request: Request) {
  const reference = randomUUID().slice(0, 8).toUpperCase();
  let userId = "";
  let sessionId = "";

  try {
    const user = await requireUser(request);
    userId = user.id;

    const body = (await request.json()) as { sessionId?: string };
    sessionId = String(body.sessionId || "").trim();

    if (!sessionId || !sessionId.startsWith("cs_")) {
      return json(
        {
          error: "A valid Stripe Checkout Session is required.",
          errorCode: "INVALID_SESSION",
          reference,
        },
        400,
      );
    }

    const result = await retrieveAndApplyActivityLabStripeSession({
      sessionId,
      environment: getStripeEnvironment(),
      expectedUserId: user.id,
    });

    const { data: wallet, error: walletError } = await supabaseAdmin
      .from("activity_lab_credit_wallet")
      .select(
        "balance_credits,lifetime_purchased_credits,lifetime_redeemed_credits",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (walletError) {
      console.warn("Activity Lab checkout confirmed but wallet refresh failed", {
        reference,
        userId: user.id,
        sessionId,
        code: walletError.code,
        message: walletError.message,
        details: walletError.details,
        hint: walletError.hint,
      });
    }

    return json(
      {
        ok: true,
        pending: result.pending,
        applied: result.applied,
        credits: result.credits,
        paymentStatus: result.paymentStatus,
        wallet: wallet
          ? {
              balanceCredits: Number(wallet.balance_credits || 0),
              lifetimePurchasedCredits: Number(
                wallet.lifetime_purchased_credits || 0,
              ),
              lifetimeRedeemedCredits: Number(
                wallet.lifetime_redeemed_credits || 0,
              ),
            }
          : null,
      },
      result.pending ? 202 : 200,
    );
  } catch (error) {
    const info = errorInfo(error);

    if (info.message === "AUTH_REQUIRED") {
      return json(
        {
          error: "Please log in to confirm this purchase.",
          errorCode: "AUTH_REQUIRED",
          reference,
        },
        401,
      );
    }

    if (info.message === "SUPABASE_AUTH_CONFIG_MISSING") {
      console.error("Activity Lab checkout confirmation configuration error", {
        reference,
        userId,
        sessionId,
        ...info,
        rawError: error,
      });

      return json(
        {
          error:
            "Checkout confirmation is temporarily unavailable. Please try again shortly.",
          errorCode: "CONFIRM_CONFIG_ERROR",
          reference,
        },
        500,
      );
    }

    if (isUserFacingValidationError(info)) {
      console.warn("Activity Lab Stripe confirmation validation rejected", {
        reference,
        userId,
        sessionId,
        ...info,
      });

      return json(
        {
          error: info.message,
          errorCode: info.code || "CHECKOUT_VALIDATION_FAILED",
          reference,
        },
        400,
      );
    }

    // Full diagnostic output stays server-side in Vercel logs.
    console.error("Activity Lab Stripe return confirmation failed", {
      reference,
      userId,
      sessionId,
      errorName: info.name,
      errorCode: info.code || null,
      errorMessage: info.message,
      errorDetails: info.details || null,
      errorHint: info.hint || null,
      rawError: error,
    });

    const databaseFailure = isDatabaseError(info);

    return json(
      {
        error: databaseFailure
          ? "Stripe payment was received, but Dreamscape could not update your Play Credit wallet. Refresh Activity Lab once. If the credits still do not appear, contact support with the reference below."
          : "Dreamscape could not finish confirming this purchase. Your Stripe payment may already be complete. Refresh Activity Lab once. If the credits still do not appear, contact support with the reference below.",
        errorCode: databaseFailure
          ? "CREDIT_WALLET_UPDATE_FAILED"
          : "CHECKOUT_CONFIRMATION_FAILED",
        reference,
      },
      500,
    );
  }
}
