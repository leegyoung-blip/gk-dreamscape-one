import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type FailureEmailResult = {
  sent: boolean;
  skipped: boolean;
  resendEmailId: string | null;
  recipient: string;
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function sendAgentFailureEmail(failureId: string): Promise<FailureEmailResult> {
  const admin = createAdminClient();

  const { data: failure, error: failureError } = await admin
    .from("agent_runtime_failures")
    .select(`
      id, agent_user_id, session_id, action_request_id,
      failure_scope, severity, error_code, message, context,
      failure_streak_after, auto_paused, created_at
    `)
    .eq("id", failureId)
    .maybeSingle();

  if (failureError || !failure) {
    throw new Error(failureError?.message || "Agent runtime failure was not found.");
  }

  const { data: runtimeSettings, error: settingsError } = await admin
    .from("agent_runtime_settings")
    .select("failure_email_recipient")
    .eq("singleton_key", "global")
    .maybeSingle();

  if (settingsError || !runtimeSettings) {
    throw new Error(settingsError?.message || "Agent runtime email settings were not found.");
  }

  let agentCode = "SYSTEM";
  let naturalName = "DREAMSCAPE Agent Runtime";

  if (failure.agent_user_id) {
    const { data: agent, error: agentError } = await admin
      .from("agent_profiles")
      .select("agent_code,natural_name")
      .eq("user_id", failure.agent_user_id)
      .maybeSingle();

    if (agentError) throw new Error(agentError.message);
    if (agent) {
      agentCode = String(agent.agent_code);
      naturalName = String(agent.natural_name || agentCode);
    }
  }

  const recipient = String(runtimeSettings.failure_email_recipient || "admin@gurukidspro.com");
  const severity = String(failure.severity || "error").toUpperCase();
  const subject = `[DREAMSCAPE Agent ${severity}] ${agentCode} · ${failure.error_code}`;

  const { data: existingLog, error: existingLogError } = await admin
    .from("agent_failure_email_logs")
    .select("id,status,attempts,resend_email_id")
    .eq("failure_id", failureId)
    .maybeSingle();

  if (existingLogError) throw new Error(existingLogError.message);

  if (existingLog?.status === "sent") {
    return {
      sent: false,
      skipped: true,
      resendEmailId: existingLog.resend_email_id || null,
      recipient,
    };
  }

  if (existingLog) {
    const { error } = await admin
      .from("agent_failure_email_logs")
      .update({
        recipient_email: recipient,
        subject,
        status: "pending",
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingLog.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin.from("agent_failure_email_logs").insert({
      failure_id: failureId,
      recipient_email: recipient,
      subject,
      status: "pending",
      attempts: 0,
    });
    if (error) throw new Error(error.message);
  }

  const from =
  requiredEnv(
    "AGENT_FAILURE_FROM_EMAIL",
  );

const apiKey =
  requiredEnv(
    "AGENT_FAILURE_RESEND_API_KEY",
  );
  const context = failure.context && typeof failure.context === "object"
    ? JSON.stringify(failure.context, null, 2)
    : "{}";

  const html = `<!doctype html><html><body style="margin:0;background:#07101f;font-family:Arial,sans-serif;color:#eaf6ff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px;background:#07101f;"><tr><td align="center">
  <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;background:#0d1b31;border:1px solid #294565;border-radius:20px;overflow:hidden;">
  <tr><td style="padding:26px 30px;background:#102441;"><div style="font-size:11px;font-weight:800;letter-spacing:1.6px;color:#7ee8ff;">DREAMSCAPE AGENT FRAMEWORK</div><h1 style="margin:10px 0 0;font-size:24px;color:#fff;">Runtime failure alert</h1></td></tr>
  <tr><td style="padding:28px 30px;">
  <p><b>Severity:</b> ${escapeHtml(severity)}<br><b>Scope:</b> ${escapeHtml(failure.failure_scope)}<br><b>Agent:</b> ${escapeHtml(agentCode)} · ${escapeHtml(naturalName)}<br><b>Code:</b> ${escapeHtml(failure.error_code)}<br><b>Failure streak:</b> ${escapeHtml(failure.failure_streak_after)}<br><b>Auto-paused:</b> ${failure.auto_paused ? "YES" : "NO"}<br><b>Time:</b> ${escapeHtml(failure.created_at)}</p>
  <div style="margin-top:22px;padding:16px 18px;border-radius:14px;background:#081526;border:1px solid #243b55;"><b style="color:#7ee8ff;">MESSAGE</b><p style="white-space:pre-wrap;line-height:1.65;color:#fff;">${escapeHtml(failure.message)}</p></div>
  <div style="margin-top:18px;padding:16px 18px;border-radius:14px;background:#081526;border:1px solid #243b55;"><b style="color:#7ee8ff;">CONTEXT</b><pre style="white-space:pre-wrap;word-break:break-word;font-size:11px;color:#bcd1e6;">${escapeHtml(context)}</pre></div>
  <p style="margin-top:22px;font-size:12px;color:#8fa9c4;">Failure ID: ${escapeHtml(failure.id)}<br>Session: ${escapeHtml(failure.session_id || "—")}<br>Action request: ${escapeHtml(failure.action_request_id || "—")}</p>
  </td></tr></table></td></tr></table></body></html>`;

  let lastError = "";
  const previousAttempts = Number(existingLog?.attempts || 0);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await admin
      .from("agent_failure_email_logs")
      .update({
        status: "sending",
        attempts: previousAttempts + attempt,
        updated_at: new Date().toISOString(),
      })
      .eq("failure_id", failureId);

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `agent-failure:${failureId}`,
        },
        body: JSON.stringify({ from, to: [recipient], subject, html }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
        name?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || payload.name || `Resend returned HTTP ${response.status}.`);
      }

      const resendEmailId = payload.id || null;

      const { error: sentUpdateError } = await admin
        .from("agent_failure_email_logs")
        .update({
          status: "sent",
          resend_email_id: resendEmailId,
          last_error: null,
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("failure_id", failureId);

      if (sentUpdateError) throw new Error(sentUpdateError.message);

      return { sent: true, skipped: false, resendEmailId, recipient };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Resend email failed.";
      if (attempt < 3) await sleep(attempt === 1 ? 250 : 750);
    }
  }

  await admin
    .from("agent_failure_email_logs")
    .update({
      status: "failed",
      last_error: lastError,
      updated_at: new Date().toISOString(),
    })
    .eq("failure_id", failureId);

  throw new Error(`Agent failure was recorded, but Resend could not deliver the admin alert after 3 attempts: ${lastError}`);
}
