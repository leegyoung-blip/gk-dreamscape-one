import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function requireUser(request: Request) {
  const authHeader =
    request.headers.get("authorization") || "";
  const token =
    authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";

  if (!token) throw new Error("AUTH_REQUIRED");

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
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
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);

  if (error || !user) {
    throw new Error("AUTH_REQUIRED");
  }
}

export async function GET(request: Request) {
  try {
    await requireUser(request);

    const { data, error } = await supabaseAdmin
      .from("nova_schoolwork_settings")
      .select(
        "enabled,max_file_size_mb,max_pages,max_questions,daily_upload_limit",
      )
      .eq("id", 1)
      .single();

    if (error) throw error;

    return json({
      enabled: Boolean(data.enabled),
      max_file_size_mb:
        Number(data.max_file_size_mb || 20),
      max_pages:
        Number(data.max_pages || 20),
      max_questions:
        Number(data.max_questions || 80),
      daily_upload_limit:
        Number(data.daily_upload_limit || 10),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    if (message === "AUTH_REQUIRED") {
      return json({ error: "Please sign in again." }, 401);
    }

    return json({ error: message }, 500);
  }
}
