import { NextResponse } from "next/server";
import { adminDb, authorizedAdmin, safeError } from "@/lib/founding-50/server";
import {
  buildF50FeedbackReport, f50FeedbackCsv,
  type F50Application, type F50Feedback, type F50Mail, type F50Discount,
} from "@/lib/founding-50/feedback-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await authorizedAdmin(request)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const output = new URL(request.url).searchParams.get("format");
    if (output && output !== "csv")
      return NextResponse.json({ error: "Unsupported output" }, { status: 400 });
    const db = adminDb();
    const { data: apps, error: appErr } = await db.from("founding_50_applications")
      .select("id,student_name,parent_email,status,beta_starts_at,beta_ends_at,survey_completed_at,created_at")
      .eq("status", "activated").order("created_at", { ascending: false }).limit(1000);
    if (appErr) throw appErr;
    const ids = (apps || []).map((a: {id:string}) => a.id);
    if (!ids.length) {
      const empty = buildF50FeedbackReport([], [], [], [], process.env.FOUNDING50_PUBLIC_LAUNCH_AT);
      return output === "csv"
        ? new Response(f50FeedbackCsv([]), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="founding-50-feedback.csv"', "Cache-Control": "no-store" } })
        : NextResponse.json(empty, { headers: { "Cache-Control": "no-store" } });
    }
    // Only query the 50-person activated cohort; do not expose this service-role
    // client or these rows to browser code or non-admin callers.
    const [f, m, d] = await Promise.all([
      db.from("founding_50_feedback").select("application_id,submitted_at,overall_experience,ease_of_use,child_engagement,learning_usefulness,reliability,favourite_feature,recommendation,suggestions")
        .in("application_id", ids).limit(1000),
      db.from("founding_50_email_outbox").select("application_id,kind,generation,status,sent_at,created_at")
        .in("application_id", ids).in("kind", ["beta_feedback_day23", "beta_feedback_reminder_day27", "beta_feedback_manual"]).limit(2000),
      db.from("founding_50_discounts").select("application_id,state,issued_at,redeem_by")
        .in("application_id", ids).limit(1000),
    ]);
    if (f.error || m.error || d.error) throw f.error || m.error || d.error;
    const report = buildF50FeedbackReport(
      (apps || []) as F50Application[], (f.data || []) as F50Feedback[],
      (m.data || []) as F50Mail[], (d.data || []) as F50Discount[],
      process.env.FOUNDING50_PUBLIC_LAUNCH_AT,
    );
    if (output === "csv") return new Response(f50FeedbackCsv(report.rows), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="founding-50-feedback.csv"', "Cache-Control": "private, no-store" },
    });
    return NextResponse.json(report, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    safeError(error, "Founding 50 feedback analytics unavailable");
    return NextResponse.json({ error: "Unable to load Founding 50 feedback" }, { status: 500 });
  }
}
