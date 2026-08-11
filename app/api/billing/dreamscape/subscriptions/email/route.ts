import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendDreamscapeSubscriptionEmail } from "@/lib/dreamscapeSubscriptionEmail";

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

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_AUTH_CONFIG_MISSING");
  }

  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: { Authorization: `Bearer ${token}` },
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

  return user;
}

export async function POST(request: Request) {
  try {
    const user = await requireBillingStaff(request);
    const body = (await request.json()) as {
      contractId?: string;
    };

    const contractId = String(body.contractId || "").trim();

    if (!contractId) {
      return json({ error: "contractId is required." }, 400);
    }

    const result = await sendDreamscapeSubscriptionEmail({
      contractId,
      emailType: "management_link",
      origin: new URL(request.url).origin,
      requestedBy: user.id,
    });

    return json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    if (message === "AUTH_REQUIRED") {
      return json({ error: "Please sign in again." }, 401);
    }

    if (message === "ACCESS_DENIED") {
      return json({ error: "Billing staff access required." }, 403);
    }

    console.error("Dreamscape management email failed", error);
    return json({ error: message }, 500);
  }
}
