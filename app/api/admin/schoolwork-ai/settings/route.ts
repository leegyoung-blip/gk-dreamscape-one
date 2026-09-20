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

async function requireAdmin(request: Request) {
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

  const { data: profile, error: profileError } =
    await client
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

  if (
    profileError ||
    String(profile?.role || "")
      .trim()
      .toLowerCase() !== "admin"
  ) {
    throw new Error("ADMIN_REQUIRED");
  }

  return user;
}

async function loadSettings() {
  const { data, error } = await supabaseAdmin
    .from("nova_schoolwork_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) throw error;
  return data;
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const settings = await loadSettings();

    return json({
      settings,
      environment: {
        openai_api_key_configured:
          Boolean(process.env.OPENAI_API_KEY),
        extract_model_override:
          process.env.NOVA_SCHOOLWORK_EXTRACT_MODEL || null,
        reason_model_override:
          process.env.NOVA_SCHOOLWORK_REASON_MODEL || null,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    if (message === "AUTH_REQUIRED") {
      return json({ error: "Please sign in again." }, 401);
    }

    if (message === "ADMIN_REQUIRED") {
      return json({ error: "Admin access required." }, 403);
    }

    return json({ error: message }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin(request);

    const body = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;

    if (!body) {
      return json({ error: "Settings payload is required." }, 400);
    }

    const integer = (
      key: string,
      min: number,
      max: number,
    ) => {
      const value = Number(body[key]);

      if (
        !Number.isInteger(value) ||
        value < min ||
        value > max
      ) {
        throw new Error(
          `${key} must be an integer between ${min} and ${max}.`,
        );
      }

      return value;
    };

    const decimal = (
      key: string,
      min: number,
      max: number,
    ) => {
      const value = Number(body[key]);

      if (
        !Number.isFinite(value) ||
        value < min ||
        value > max
      ) {
        throw new Error(
          `${key} must be between ${min} and ${max}.`,
        );
      }

      return value;
    };

    const text = (key: string) => {
      const value = String(body[key] ?? "").trim();

      if (!value || value.length > 120) {
        throw new Error(`${key} is invalid.`);
      }

      return value;
    };

    const updates = {
      enabled: Boolean(body.enabled),

      max_file_size_mb:
        integer("max_file_size_mb", 1, 50),

      max_pages:
        integer("max_pages", 1, 50),

      max_questions:
        integer("max_questions", 1, 200),

      daily_upload_limit:
        integer("daily_upload_limit", 1, 100),

      automatic_retry_count:
        integer("automatic_retry_count", 0, 2),

      extraction_model:
        text("extraction_model"),

      reasoning_model:
        text("reasoning_model"),

      fallback_enabled:
        Boolean(body.fallback_enabled),

      fallback_model:
        text("fallback_model"),

      warning_failure_rate_pct:
        decimal(
          "warning_failure_rate_pct",
          0,
          100,
        ),

      warning_average_latency_seconds:
        decimal(
          "warning_average_latency_seconds",
          1,
          600,
        ),

      warning_average_cost_usd:
        decimal(
          "warning_average_cost_usd",
          0,
          10,
        ),

      updated_by_user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("nova_schoolwork_settings")
      .update(updates)
      .eq("id", 1)
      .select("*")
      .single();

    if (error) throw error;

    return json({
      status: "saved",
      settings: data,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    if (message === "AUTH_REQUIRED") {
      return json({ error: "Please sign in again." }, 401);
    }

    if (message === "ADMIN_REQUIRED") {
      return json({ error: "Admin access required." }, 403);
    }

    return json({ error: message }, 400);
  }
}
