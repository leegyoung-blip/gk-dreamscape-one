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

    const [
      runsResult,
      settingsResult,
      recentFailureResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("nova_schoolwork_analysis_runs")
        .select(
          "id,upload_id,run_number,status,trigger_source,extraction_model,reasoning_model,total_cost_usd,automatic_retry_count,duration_ms,page_count,question_count,error_code,error_message,started_at,completed_at",
        )
        .gte("started_at", since),

      supabaseAdmin
        .from("nova_schoolwork_settings")
        .select("*")
        .eq("id", 1)
        .single(),

      supabaseAdmin
        .from("nova_schoolwork_analysis_runs")
        .select(
          "id,upload_id,run_number,status,error_code,error_message,started_at,completed_at,duration_ms",
        )
        .in("status", ["failed", "needs_input"])
        .order("started_at", { ascending: false })
        .limit(12),
    ]);

    if (runsResult.error) throw runsResult.error;
    if (settingsResult.error) throw settingsResult.error;
    if (recentFailureResult.error) throw recentFailureResult.error;

    const rows = runsResult.data ?? [];
    const settings = settingsResult.data;

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
        .filter((value) => Number.isFinite(value));

    const costs =
      rows
        .map((row) => Number(row.total_cost_usd))
        .filter((value) => Number.isFinite(value));

    const totalCost =
      costs.reduce(
        (sum, value) => sum + value,
        0,
      );

    const averageCost =
      costs.length > 0
        ? totalCost / costs.length
        : null;

    const averageDurationSeconds =
      durations.length > 0
        ? durations.reduce(
            (sum, value) => sum + value,
            0,
          ) /
          durations.length /
          1000
        : null;

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

    const failureRate =
      rows.length > 0
        ? ((failed + needsInput) / rows.length) *
          100
        : 0;

    const failureReasons =
      Object.entries(
        rows.reduce<Record<string, number>>(
          (acc, row) => {
            if (
              row.status !== "failed" &&
              row.status !== "needs_input"
            ) {
              return acc;
            }

            const key =
              String(
                row.error_code || "UNKNOWN",
              );

            acc[key] =
              (acc[key] || 0) + 1;

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

    const warnings: string[] = [];

    if (
      failureRate >
      Number(
        settings.warning_failure_rate_pct ||
          10,
      )
    ) {
      warnings.push(
        `Failure / needs-attention rate is ${failureRate.toFixed(
          1,
        )}%.`,
      );
    }

    if (
      averageDurationSeconds !== null &&
      averageDurationSeconds >
        Number(
          settings.warning_average_latency_seconds ||
            60,
        )
    ) {
      warnings.push(
        `Average analysis time is ${averageDurationSeconds.toFixed(
          1,
        )} seconds.`,
      );
    }

    if (
      averageCost !== null &&
      averageCost >
        Number(
          settings.warning_average_cost_usd ||
            0.15,
        )
    ) {
      warnings.push(
        `Average estimated analysis cost is $${averageCost.toFixed(
          4,
        )}.`,
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      warnings.unshift(
        "OPENAI_API_KEY is not configured on the server.",
      );
    }

    if (!settings.enabled) {
      warnings.unshift(
        "Schoolwork AI is paused by the admin kill switch.",
      );
    }

    return json({
      window_days: days,
      generated_at:
        new Date().toISOString(),

      environment: {
        openai_api_key_configured:
          Boolean(process.env.OPENAI_API_KEY),
      },

      settings: {
        enabled: Boolean(settings.enabled),
        extraction_model:
          settings.extraction_model,
        reasoning_model:
          settings.reasoning_model,
        fallback_enabled:
          Boolean(settings.fallback_enabled),
        fallback_model:
          settings.fallback_model,
      },

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

      failure_rate:
        Math.round(failureRate * 10) / 10,

      average_duration_seconds:
        averageDurationSeconds === null
          ? null
          : Math.round(
              averageDurationSeconds * 10,
            ) / 10,

      total_estimated_cost_usd:
        Math.round(totalCost * 10000) /
        10000,

      average_estimated_cost_usd:
        averageCost === null
          ? null
          : Math.round(
              averageCost * 10000,
            ) / 10000,

      questions_analysed:
        totalQuestions,

      automatic_retries:
        autoRetries,

      failure_reasons:
        failureReasons,

      warnings,

      recent_failures:
        recentFailureResult.data ?? [],
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
