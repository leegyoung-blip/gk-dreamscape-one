import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient, requireAdmin } from "@/lib/buildersAdminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const SELECT_FIELDS = `
  id,
  application_code,
  full_name,
  email,
  school_organisation,
  career_stage,
  area,
  project_id,
  project_title,
  application_mode,
  skills_summary,
  learning_goal,
  self_started_example,
  portfolio_url,
  availability,
  cv_path,
  status,
  notification_status,
  notification_error,
  resend_email_id,
  notified_at,
  reviewed_at,
  reviewed_by,
  contacted_at,
  contacted_by,
  status_updated_at,
  status_updated_by,
  created_at,
  updated_at
`;

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json(
      { ok: false, error: admin.error },
      { status: admin.status },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const supabase = getServiceRoleClient();

    if (id) {
      const { data: application, error } = await supabase
        .from("dreamscape_builder_applications")
        .select(SELECT_FIELDS)
        .eq("id", id)
        .single();

      if (error || !application) {
        return NextResponse.json(
          { ok: false, error: "Application not found." },
          { status: 404 },
        );
      }

      const [notesResult, historyResult] = await Promise.all([
        supabase
          .from("dreamscape_builder_application_notes")
          .select("id, note, created_by, created_at")
          .eq("application_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("dreamscape_builder_application_status_history")
          .select("id, old_status, new_status, changed_by, created_at")
          .eq("application_id", id)
          .order("created_at", { ascending: false }),
      ]);

      if (notesResult.error) throw notesResult.error;
      if (historyResult.error) throw historyResult.error;

      return NextResponse.json({
        ok: true,
        application,
        notes: notesResult.data || [],
        statusHistory: historyResult.data || [],
      });
    }

    const status = searchParams.get("status") || "all";
    const area = searchParams.get("area") || "all";
    const project = searchParams.get("project") || "all";
    const contacted = searchParams.get("contacted") || "all";
    const search = (searchParams.get("search") || "").trim();
    const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);

    let query = supabase
      .from("dreamscape_builder_applications")
      .select(SELECT_FIELDS, { count: "exact" })
      .order("created_at", { ascending: false });

    if (status !== "all") query = query.eq("status", status);
    if (area !== "all") query = query.eq("area", area);
    if (project !== "all") query = query.eq("project_id", project);
    if (contacted === "yes") query = query.not("contacted_at", "is", null);
    if (contacted === "no") query = query.is("contacted_at", null);

    if (search) {
      const safe = search.replace(/[%(),]/g, " ").trim();
      if (safe) {
        query = query.or(
          `full_name.ilike.%${safe}%,email.ilike.%${safe}%,application_code.ilike.%${safe}%`,
        );
      }
    }

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error, count } = await query.range(from, to);

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      applications: data || [],
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total: count || 0,
        totalPages: Math.max(1, Math.ceil((count || 0) / PAGE_SIZE)),
      },
    });
  } catch (error) {
    console.error("Dreamscape Builders admin list error:", error);
    return NextResponse.json(
      { ok: false, error: "Unable to load builder applications." },
      { status: 500 },
    );
  }
}
