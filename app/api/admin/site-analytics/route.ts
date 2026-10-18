import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/buildersAdminAuth";
import { analyticsConfigured, readVercelTraffic } from "@/lib/analytics/vercel";
import type { TrafficRange } from "@/lib/analytics/vercel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function privateJson(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET(request: NextRequest) {
  // Do not trust user-editable auth metadata for admin authorization.
  // Validate the Supabase JWT, then read the database's actual profiles.role.
  const authHeader = request.headers.get("authorization") || "";
  const token = /^Bearer\s+(.+)$/i.exec(authHeader)?.[1]?.trim();
  if (!token) return privateJson({ ok: false, error: "Sign in to view site analytics." }, 401);

  try {
    const service = getServiceRoleClient();
    const { data: { user }, error: authError } = await service.auth.getUser(token);
    if (authError || !user) return privateJson({ ok: false, error: "Session expired. Please sign in again." }, 401);

    const { data: profile, error: profileError } = await service
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError || String(profile?.role || "").trim().toLowerCase() !== "admin") {
      return privateJson({ ok: false, error: "Administrator access required." }, 403);
    }

    const rangeParam = new URL(request.url).searchParams.get("range") || "7d";
    if (!["today", "7d", "30d"].includes(rangeParam)) {
      return privateJson({ ok: false, error: "Invalid date range." }, 400);
    }
    if (!analyticsConfigured()) {
      return privateJson({ ok: false, error: "Vercel Analytics credentials have not been configured in Environment Variables." }, 503);
    }

    const report = await readVercelTraffic(rangeParam as TrafficRange);
    return privateJson({ ok: true, report }, 200);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    console.error("Site Analytics API:", code);
    if (code === "VERCEL_ANALYTICS_UPSTREAM_401" || code === "VERCEL_ANALYTICS_UPSTREAM_403") {
      return privateJson({ ok: false, error: "Vercel rejected the API token or its access to this team/project." }, 502);
    }
    if (code === "VERCEL_ANALYTICS_UPSTREAM_429") {
      return privateJson({ ok: false, error: "Vercel's API rate limit has been reached. Please retry shortly." }, 503);
    }
    if (code.startsWith("VERCEL_ANALYTICS_UPSTREAM_")) {
      return privateJson({ ok: false, error: `Vercel Analytics returned an API error (${code.replace("VERCEL_ANALYTICS_UPSTREAM_", "")}).` }, 502);
    }
    return privateJson({ ok: false, error: "Unable to load site traffic right now. Try again shortly." }, 502);
  }
}
