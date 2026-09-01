import "server-only";

import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAgentFailureEmail } from "@/lib/agents/runtime/failureEmail";

export type AgentFailureScope = "agent" | "orchestrator" | "action" | "system";
export type AgentFailureSeverity = "warning" | "error" | "critical";

export type ReportAgentFailureArgs = {
  admin?: SupabaseClient;
  agentUserId?: string | null;
  sessionId?: string | null;
  actionRequestId?: string | null;
  scope: AgentFailureScope;
  severity?: AgentFailureSeverity;
  errorCode: string;
  message: string;
  context?: Record<string, unknown>;
  idempotencyKey?: string;
  createdBy?: string | null;
};

export async function reportAgentFailure({
  admin: suppliedAdmin,
  agentUserId = null,
  sessionId = null,
  actionRequestId = null,
  scope,
  severity = "error",
  errorCode,
  message,
  context = {},
  idempotencyKey = `agent-failure:${randomUUID()}`,
  createdBy = null,
}: ReportAgentFailureArgs) {
  const admin = suppliedAdmin || createAdminClient();

  const { data, error } = await admin.rpc("agent_record_runtime_failure", {
    p_agent_user_id: agentUserId,
    p_session_id: sessionId,
    p_action_request_id: actionRequestId,
    p_failure_scope: scope,
    p_severity: severity,
    p_error_code: errorCode,
    p_message: message,
    p_context: context,
    p_idempotency_key: idempotencyKey,
    p_created_by: createdBy,
  });

  if (error || !data) {
    throw new Error(error?.message || "Agent failure could not be recorded.");
  }

  const result = data as {
    failure_id?: string;
    failure_streak_after?: number;
    auto_paused?: boolean;
    duplicate?: boolean;
  };

  const failureId = String(result.failure_id || "");
  if (!failureId) throw new Error("Agent failure recorder did not return a failure id.");

  try {
    const email = await sendAgentFailureEmail(failureId);
    return {
      failureId,
      failureStreakAfter: Number(result.failure_streak_after || 0),
      autoPaused: Boolean(result.auto_paused),
      duplicate: Boolean(result.duplicate),
      email,
    };
  } catch (emailError) {
    console.error("Agent failure alert email failed:", emailError);
    return {
      failureId,
      failureStreakAfter: Number(result.failure_streak_after || 0),
      autoPaused: Boolean(result.auto_paused),
      duplicate: Boolean(result.duplicate),
      email: {
        sent: false,
        skipped: false,
        resendEmailId: null,
        recipient: null,
        error: emailError instanceof Error ? emailError.message : "Resend failure alert could not be delivered.",
      },
    };
  }
}

export async function retryFailedAgentFailureEmails(limit = 20) {
  const admin = createAdminClient();
  const cleanLimit = Math.min(100, Math.max(1, Math.floor(limit)));

  const { data, error } = await admin
    .from("agent_failure_email_logs")
    .select("failure_id,status,updated_at")
    .in("status", ["pending", "failed"])
    .order("updated_at", { ascending: true })
    .limit(cleanLimit);

  if (error) throw new Error(error.message);

  const results: Array<{ failureId: string; sent: boolean; error?: string }> = [];

  for (const row of data || []) {
    const failureId = String(row.failure_id);
    try {
      const result = await sendAgentFailureEmail(failureId);
      results.push({ failureId, sent: result.sent || result.skipped });
    } catch (retryError) {
      results.push({
        failureId,
        sent: false,
        error: retryError instanceof Error ? retryError.message : "Retry failed.",
      });
    }
  }

  return results;
}
