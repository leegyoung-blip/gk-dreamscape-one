import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { checkAdminFromRequest } from "@/lib/checkAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  reportAgentFailure,
  retryFailedAgentFailureEmails,
} from "@/lib/agents/runtime/failures";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function resolveAgentUserId(
  admin: ReturnType<typeof createAdminClient>,
  body: { agentCode?: string; userId?: string },
) {
  const suppliedUserId = String(body.userId || "").trim();
  if (suppliedUserId) return suppliedUserId;

  const agentCode = String(body.agentCode || "").trim().toUpperCase();
  if (!agentCode) throw new Error("Provide agentCode or userId.");

  const { data, error } = await admin
    .from("agent_profiles")
    .select("user_id")
    .eq("agent_code", agentCode)
    .maybeSingle();

  if (error || !data) throw new Error(error?.message || `Agent ${agentCode} was not found.`);
  return String(data.user_id);
}

export async function POST(request: Request) {
  const access = await checkAdminFromRequest(request);
  if (!access.isAdmin || !access.user) {
    return json({ ok: false, error: access.error || "Admin access required." }, 403);
  }

  try {
    const body = (await request.json()) as {
      action?: string;
      agentCode?: string;
      userId?: string;
      reason?: string;
    };

    const action = String(body.action || "").trim().toLowerCase();
    const admin = createAdminClient();

    if (action === "emergency_stop") {
      const { data, error } = await admin.rpc("agent_emergency_stop", {
        p_reason: String(body.reason || "Emergency stop from Agent Control Centre."),
        p_actor: access.user.id,
      });
      if (error) throw new Error(error.message);
      return json({ ok: true, action, pausedActiveAgents: Number(data || 0) });
    }

    if (action === "pause_agent") {
      const agentUserId = await resolveAgentUserId(admin, body);
      const { error } = await admin.rpc("agent_admin_pause_agent", {
        p_agent_user_id: agentUserId,
        p_reason: String(body.reason || "Paused by administrator."),
        p_actor: access.user.id,
      });
      if (error) throw new Error(error.message);
      return json({ ok: true, action, agentUserId });
    }

    if (action === "resume_agent") {
      const agentUserId = await resolveAgentUserId(admin, body);
      const { error } = await admin.rpc("agent_admin_resume_agent_to_dormant", {
        p_agent_user_id: agentUserId,
        p_reason: String(body.reason || "Resumed to dormant by administrator."),
        p_actor: access.user.id,
      });
      if (error) throw new Error(error.message);
      return json({ ok: true, action, agentUserId });
    }

    if (action === "test_failure_email") {
      const result = await reportAgentFailure({
        admin,
        agentUserId: null,
        scope: "system",
        severity: "warning",
        errorCode: "PHASE3A_RESEND_TEST",
        message:
          "Phase 3A Resend failure-alert test. This is an intentional test generated from the Agent Control Centre.",
        context: {
          test: true,
          phase: "3A",
          requestedBy: access.user.id,
        },
        idempotencyKey: `phase3a-email-test:${randomUUID()}`,
        createdBy: access.user.id,
      });

      return json({
        ok: Boolean(result.email && "sent" in result.email && result.email.sent),
        action,
        result,
      });
    }

    if (action === "retry_failure_emails") {
      const results = await retryFailedAgentFailureEmails(20);
      return json({ ok: true, action, results });
    }

    if (action === "activate_pilot") {
      return json(
        {
          ok: false,
          error:
            "Pilot activation is locked during Phase 3A. Brain V1, execution adapters and orchestrator safety must be installed first.",
        },
        409,
      );
    }

    return json({ ok: false, error: "Unsupported runtime action." }, 400);
  } catch (error) {
    console.error("Agent runtime admin action failed:", error);
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Agent runtime action failed.",
      },
      500,
    );
  }
}
