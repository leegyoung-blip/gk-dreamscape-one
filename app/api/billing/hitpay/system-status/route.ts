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

function hasEnv(name: string) {
  return Boolean(process.env[name]?.trim());
}

function firstDetected(names: string[]) {
  return names.find((name) => hasEnv(name)) || null;
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
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

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

    const resendName = firstDetected([
      "RESEND_API_KEY",
      "RESEND_KEY",
    ]);

    const serviceRoleName = firstDetected([
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_SERVICE_KEY",
    ]);

    const hitpayEnvironmentName = firstDetected([
      "HITPAY_ENVIRONMENT",
      "HITPAY_ENV",
    ]);

    const hitpayProductionApiKeyName = firstDetected([
      "HITPAY_PRODUCTION_API_KEY",
      "HITPAY_API_KEY",
    ]);

    const hitpayProductionWebhookSaltName = firstDetected([
      "HITPAY_PRODUCTION_WEBHOOK_SALT",
      "HITPAY_WEBHOOK_SALT",
      "HITPAY_WEBHOOK_SECRET",
    ]);

    const hitpayEnvironment =
      process.env.HITPAY_ENVIRONMENT?.trim() ||
      process.env.HITPAY_ENV?.trim() ||
      "not set";

    const hitpayConfigured =
      hitpayEnvironment === "production"
        ? Boolean(
            hitpayProductionApiKeyName &&
              hitpayProductionWebhookSaltName,
          )
        : Boolean(
            firstDetected([
              "HITPAY_SANDBOX_API_KEY",
            ]) &&
              firstDetected([
                "HITPAY_SANDBOX_WEBHOOK_SALT",
              ]),
          );

    return json({
      hitpayConfigured,
      hitpayEnvironment,
      resendConfigured: Boolean(resendName),
      resendFrom:
        process.env.RESEND_FROM?.trim() ||
        "Guru Kids Pro <admin@gurukidspro.com>",
      serviceRoleConfigured: Boolean(serviceRoleName),

      diagnostics: {
        vercelEnvironment:
          process.env.VERCEL_ENV || "not available",
        vercelTargetEnvironment:
          process.env.VERCEL_TARGET_ENV || "not available",
        gitBranch:
          process.env.VERCEL_GIT_COMMIT_REF || "not available",
        productionUrl:
          process.env.VERCEL_PROJECT_PRODUCTION_URL ||
          "not available",

        detectedVariableNames: {
          resend: resendName,
          supabaseServiceRole: serviceRoleName,
          hitpayEnvironment: hitpayEnvironmentName,
          hitpayProductionApiKey: hitpayProductionApiKeyName,
          hitpayProductionWebhookSalt:
            hitpayProductionWebhookSaltName,
        },

        exactExpectedNames: {
          RESEND_API_KEY: hasEnv("RESEND_API_KEY"),
          SUPABASE_SERVICE_ROLE_KEY: hasEnv(
            "SUPABASE_SERVICE_ROLE_KEY",
          ),
          HITPAY_ENVIRONMENT: hasEnv("HITPAY_ENVIRONMENT"),
          HITPAY_PRODUCTION_API_KEY: hasEnv(
            "HITPAY_PRODUCTION_API_KEY",
          ),
          HITPAY_PRODUCTION_WEBHOOK_SALT: hasEnv(
            "HITPAY_PRODUCTION_WEBHOOK_SALT",
          ),
        },
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Status unavailable.";

    if (message === "AUTH_REQUIRED") {
      return json({ error: "Please sign in again." }, 401);
    }

    if (message === "ACCESS_DENIED") {
      return json(
        { error: "Billing staff access is required." },
        403,
      );
    }

    return json({ error: message }, 500);
  }
}
