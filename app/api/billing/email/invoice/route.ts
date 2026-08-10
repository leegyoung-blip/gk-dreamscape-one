import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  sendGkpBillingEmail,
  sendGkpInvoiceBatch,
} from "@/lib/gkpBillingEmail";

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

  if (!token) {
    throw new Error("AUTH_REQUIRED");
  }

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
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

  if (userError || !user) {
    throw new Error("AUTH_REQUIRED");
  }

  const { data: allowed, error: accessError } = await client.rpc(
    "gkp_is_billing_staff",
  );

  if (accessError || !allowed) {
    throw new Error("ACCESS_DENIED");
  }

  return user;
}

export async function POST(request: Request) {
  try {
    const user = await requireBillingStaff(request);
    const body = (await request.json()) as {
      invoiceId?: string;
      batchId?: string;
      mode?: "issued" | "resend";
    };

    const origin = new URL(request.url).origin;

    if (body.batchId) {
      const result = await sendGkpInvoiceBatch({
        batchId: String(body.batchId),
        origin,
        requestedBy: user.id,
      });

      return json(result);
    }

    const invoiceId = String(body.invoiceId || "").trim();
    if (!invoiceId) {
      return json({ error: "invoiceId is required." }, 400);
    }

    const result = await sendGkpBillingEmail({
      invoiceId,
      emailType:
        body.mode === "resend" ? "invoice_resent" : "invoice_issued",
      origin,
      requestedBy: user.id,
    });

    return json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Email could not be sent.";

    if (message === "AUTH_REQUIRED") {
      return json({ error: "Please sign in again." }, 401);
    }

    if (message === "ACCESS_DENIED") {
      return json({ error: "Billing staff access is required." }, 403);
    }

    console.error("Billing invoice email route failed", error);
    return json({ error: message }, 500);
  }
}
