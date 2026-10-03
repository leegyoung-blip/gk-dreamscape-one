import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient, requireAdmin } from "@/lib/buildersAdminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const body = await request.json().catch(() => null);
    const note = typeof body?.note === "string" ? body.note.trim() : "";

    if (!note || note.length > 4000) {
      return NextResponse.json(
        { ok: false, error: "Note must be between 1 and 4,000 characters." },
        { status: 400 },
      );
    }

    const supabase = getServiceRoleClient();

    const { data: application, error: applicationError } = await supabase
      .from("dreamscape_builder_applications")
      .select("id, reviewed_at")
      .eq("id", id)
      .single();

    if (applicationError || !application) {
      return NextResponse.json(
        { ok: false, error: "Application not found." },
        { status: 404 },
      );
    }

    const { data: inserted, error: noteError } = await supabase
      .from("dreamscape_builder_application_notes")
      .insert({
        application_id: id,
        note,
        created_by: admin.user.id,
      })
      .select("id, note, created_by, created_at")
      .single();

    if (noteError) throw noteError;

    if (!application.reviewed_at) {
      await supabase
        .from("dreamscape_builder_applications")
        .update({
          reviewed_at: new Date().toISOString(),
          reviewed_by: admin.user.id,
        })
        .eq("id", id);
    }

    return NextResponse.json({ ok: true, note: inserted });
  } catch (error) {
    console.error("Dreamscape Builders admin note error:", error);
    return NextResponse.json(
      { ok: false, error: "Unable to save the internal note." },
      { status: 500 },
    );
  }
}
