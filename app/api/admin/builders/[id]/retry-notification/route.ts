import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient, requireAdmin } from "@/lib/buildersAdminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function modeLabel(mode: string) {
  if (mode === "interest") return "Register Interest";
  if (mode === "pitch") return "Pitch Yourself";
  return "Project Application";
}

function buildAdminEmail(application: any) {
  const portfolio = application.portfolio_url
    ? `<a href="${escapeHtml(application.portfolio_url)}" style="color:#2563eb;">${escapeHtml(application.portfolio_url)}</a>`
    : "Not provided";

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f6f8fb;padding:28px;color:#172033;">
      <div style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #e4e8ef;border-radius:18px;overflow:hidden;">
        <div style="padding:24px 28px;background:#071426;color:#ffffff;">
          <div style="font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#9eeaff;">Dreamscape Builders</div>
          <h1 style="margin:10px 0 0;font-size:26px;line-height:1.2;">Builder application notification</h1>
          <p style="margin:9px 0 0;color:#cad5e4;font-size:14px;">Reference: ${escapeHtml(application.application_code)}</p>
        </div>
        <div style="padding:26px 28px;">
          <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.55;">
            <tr><td style="padding:7px 0;color:#6b7280;width:180px;">Application type</td><td style="padding:7px 0;font-weight:700;">${escapeHtml(modeLabel(application.application_mode))}</td></tr>
            <tr><td style="padding:7px 0;color:#6b7280;">Project</td><td style="padding:7px 0;font-weight:700;">${escapeHtml(application.project_title)}</td></tr>
            <tr><td style="padding:7px 0;color:#6b7280;">Area</td><td style="padding:7px 0;">${escapeHtml(application.area)}</td></tr>
            <tr><td style="padding:7px 0;color:#6b7280;">Name</td><td style="padding:7px 0;">${escapeHtml(application.full_name)}</td></tr>
            <tr><td style="padding:7px 0;color:#6b7280;">Applicant email</td><td style="padding:7px 0;">${escapeHtml(application.email)}</td></tr>
            <tr><td style="padding:7px 0;color:#6b7280;">School / organisation</td><td style="padding:7px 0;">${escapeHtml(application.school_organisation || "Not provided")}</td></tr>
            <tr><td style="padding:7px 0;color:#6b7280;">Current stage</td><td style="padding:7px 0;">${escapeHtml(application.career_stage)}</td></tr>
            <tr><td style="padding:7px 0;color:#6b7280;">Availability</td><td style="padding:7px 0;">${escapeHtml(application.availability)}</td></tr>
            <tr><td style="padding:7px 0;color:#6b7280;">Portfolio / work link</td><td style="padding:7px 0;">${portfolio}</td></tr>
            <tr><td style="padding:7px 0;color:#6b7280;">CV / Resume</td><td style="padding:7px 0;">${application.cv_path ? "Uploaded privately" : "Not provided"}</td></tr>
          </table>
          <div style="margin-top:24px;padding-top:22px;border-top:1px solid #e8ebf0;">
            <h2 style="margin:0 0 8px;font-size:16px;">What they can do</h2>
            <p style="margin:0;white-space:pre-wrap;color:#374151;">${escapeHtml(application.skills_summary)}</p>
          </div>
          <div style="margin-top:22px;">
            <h2 style="margin:0 0 8px;font-size:16px;">What they want to learn or build</h2>
            <p style="margin:0;white-space:pre-wrap;color:#374151;">${escapeHtml(application.learning_goal)}</p>
          </div>
          <div style="margin-top:22px;">
            <h2 style="margin:0 0 8px;font-size:16px;">Something they made, started or figured out</h2>
            <p style="margin:0;white-space:pre-wrap;color:#374151;">${escapeHtml(application.self_started_example)}</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json(
      { ok: false, error: admin.error },
      { status: admin.status },
    );
  }

  try {
    const { id } = await context.params;
    const apiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.DREAMSCAPE_BUILDERS_ADMIN_EMAIL;
    const fromEmail = process.env.DREAMSCAPE_BUILDERS_FROM_EMAIL;

    if (!apiKey || !adminEmail || !fromEmail) {
      return NextResponse.json(
        { ok: false, error: "Resend environment variables are not configured." },
        { status: 500 },
      );
    }

    const supabase = getServiceRoleClient();
    const { data: application, error: applicationError } = await supabase
      .from("dreamscape_builder_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (applicationError || !application) {
      return NextResponse.json(
        { ok: false, error: "Application not found." },
        { status: 404 },
      );
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [adminEmail],
        subject: `[Dreamscape Builders] ${application.project_title} — ${application.full_name}`,
        html: buildAdminEmail(application),
        reply_to: application.email,
      }),
    });

    const responseBody = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        typeof responseBody?.message === "string"
          ? responseBody.message
          : `Resend notification failed with status ${response.status}.`;

      await supabase
        .from("dreamscape_builder_applications")
        .update({
          notification_status: "failed",
          notification_error: message.slice(0, 1000),
        })
        .eq("id", id);

      return NextResponse.json(
        { ok: false, error: "Notification retry failed. The application is still safely stored." },
        { status: 502 },
      );
    }

    const resendId = typeof responseBody?.id === "string" ? responseBody.id : null;
    const notifiedAt = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from("dreamscape_builder_applications")
      .update({
        notification_status: "sent",
        notification_error: null,
        notified_at: notifiedAt,
        resend_email_id: resendId,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, application: updated });
  } catch (error) {
    console.error("Dreamscape Builders notification retry error:", error);
    return NextResponse.json(
      { ok: false, error: "Unable to retry the admin notification right now." },
      { status: 500 },
    );
  }
}
