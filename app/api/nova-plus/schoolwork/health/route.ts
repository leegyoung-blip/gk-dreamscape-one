import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

async function requireAdmin(request: Request) {
  const authHeader =
    request.headers.get("authorization") || "";

  const token =
    authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";

  if (!token) {
    throw new Error("AUTH_REQUIRED");
  }

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

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const url = new URL(request.url);
    const requestedDays =
      Number(url.searchParams.get("days") || 7);

    const days =
      Number.isFinite(requestedDays)
        ? Math.max(
            1,
            Math.min(90, Math.round(requestedDays)),
          )
        : 7;

    const since = new Date(
      Date.now() -
        days * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: runs, error } =
      await supabaseAdmin
        .from("nova_schoolwork_analysis_runs")
        .select(
          "status,trigger_source,extraction_model,reasoning_model,total_cost_usd,automatic_retry_count,duration_ms,page_count,question_count,error_code,started_at,completed_at",
        )
        .gte("started_at", since);

    if (error) throw error;

    const rows = runs ?? [];

    const succeeded =
      rows.filter(
        (row) => row.status === "succeeded",
      ).length;

    const failed =
      rows.filter(
        (row) => row.status === "failed",
      ).length;

    const needsInput =
      rows.filter(
        (row) => row.status === "needs_input",
      ).length;

    const durations =
      rows
        .map((row) => Number(row.duration_ms))
        .filter((value) =>
          Number.isFinite(value),
        );

    const costs =
      rows
        .map((row) =>
          Number(row.total_cost_usd),
        )
        .filter((value) =>
          Number.isFinite(value),
        );

    const totalCost =
      costs.reduce(
        (sum, value) => sum + value,
        0,
      );

    const totalQuestions =
      rows.reduce(
        (sum, row) =>
          sum +
          Number(row.question_count || 0),
        0,
      );

    const autoRetries =
      rows.reduce(
        (sum, row) =>
          sum +
          Number(
            row.automatic_retry_count || 0,
          ),
        0,
      );

    const failureReasons =
      Object.entries(
        rows.reduce<Record<string, number>>(
          (acc, row) => {
            const key =
              String(
                row.error_code || "UNKNOWN",
              );

            if (
              row.status === "failed" ||
              row.status === "needs_input"
            ) {
              acc[key] =
                (acc[key] || 0) + 1;
            }

            return acc;
          },
          {},
        ),
      )
        .map(([code, count]) => ({
          code,
          count,
        }))
        .sort(
          (a, b) =>
            b.count - a.count,
        );

    return json({
      window_days: days,
      generated_at:
        new Date().toISOString(),

      runs: rows.length,
      succeeded,
      failed,
      needs_input: needsInput,

      success_rate:
        rows.length > 0
          ? Math.round(
              (succeeded / rows.length) *
                1000,
            ) / 10
          : null,

      average_duration_seconds:
        durations.length > 0
          ? Math.round(
              (
                durations.reduce(
                  (sum, value) =>
                    sum + value,
                  0,
                ) /
                durations.length /
                1000
              ) *
                10,
            ) / 10
          : null,

      total_estimated_cost_usd:
        Math.round(totalCost * 10000) /
        10000,

      average_estimated_cost_usd:
        costs.length > 0
          ? Math.round(
              (totalCost / costs.length) *
                10000,
            ) / 10000
          : null,

      questions_analysed:
        totalQuestions,

      automatic_retries:
        autoRetries,

      failure_reasons:
        failureReasons,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    if (message === "AUTH_REQUIRED") {
      return json(
        { error: "Please sign in again." },
        401,
      );
    }

    if (message === "ADMIN_REQUIRED") {
      return json(
        { error: "Admin access required." },
        403,
      );
    }

    console.error(
      "Schoolwork health endpoint failed",
      error,
    );

    return json(
      { error: message },
      500,
    );
  }
}
