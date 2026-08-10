import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("SUPABASE_AUTH_CONFIG_MISSING");
  }

  const client = createClient(url, anonKey, {
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

  const { data: allowed, error } = await client.rpc(
    "gkp_is_billing_staff",
  );

  if (error || !allowed) throw new Error("ACCESS_DENIED");
}

export async function GET(request: Request) {
  try {
    await requireBillingStaff(request);

    const hitpayEnvironment =
      process.env.HITPAY_ENVIRONMENT?.trim() || "not set";

    const hitpayConfigured =
      hitpayEnvironment === "production"
        ? Boolean(
            process.env.HITPAY_PRODUCTION_API_KEY?.trim() &&
              process.env.HITPAY_PRODUCTION_WEBHOOK_SALT?.trim(),
          )
        : Boolean(
            process.env.HITPAY_SANDBOX_API_KEY?.trim() &&
              process.env.HITPAY_SANDBOX_WEBHOOK_SALT?.trim(),
          );

    return json({
      hitpayConfigured,
      hitpayEnvironment,
      resendConfigured: Boolean(
        process.env.RESEND_API_KEY?.trim(),
      ),
      resendFrom:
        process.env.RESEND_FROM?.trim() ||
        "Guru Kids Pro <admin@gurukidspro.com>",
      serviceRoleConfigured: Boolean(
        process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
      ),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Status unavailable.";

    if (message === "AUTH_REQUIRED") {
      return json({ error: "Please sign in again." }, 401);
    }

    if (message === "ACCESS_DENIED") {
      return json({ error: "Billing staff access is required." }, 403);
    }

    return json({ error: message }, 500);
  }
}
