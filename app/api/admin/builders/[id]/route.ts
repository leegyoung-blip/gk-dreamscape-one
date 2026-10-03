import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient, requireAdmin } from "@/lib/buildersAdminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set([
  "new",
  "reviewing",
  "shortlisted",
  "accepted",
  "declined",
  "completed",
]);

export async function PATCH(
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
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Invalid request." },
        { status: 400 },
      );
    }

    const supabase = getServiceRoleClient();

    const { data: current, error: currentError } = await supabase
      .from("dreamscape_builder_applications")
      .select("id, status, reviewed_at, reviewed_by, contacted_at, contacted_by")
      .eq("id", id)
      .single();

    if (currentError || !current) {
      return NextResponse.json(
        { ok: false, error: "Application not found." },
        { status: 404 },
      );
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {};
    let statusChanged = false;
    let nextStatus = current.status as string;

    if (typeof body.status === "string") {
      if (!VALID_STATUSES.has(body.status)) {
        return NextResponse.json(
          { ok: false, error: "Invalid application status." },
          { status: 400 },
        );
      }

      if (body.status !== current.status) {
        nextStatus = body.status;
        statusChanged = true;
        updates.status = body.status;
        updates.status_updated_at = now;
        updates.status_updated_by = admin.user.id;

        if (!current.reviewed_at) {
          updates.reviewed_at = now;
          updates.reviewed_by = admin.user.id;
        }
      }
    }

    if (typeof body.contacted === "boolean") {
      if (body.contacted) {
        updates.contacted_at = current.contacted_at || now;
        updates.contacted_by = current.contacted_by || admin.user.id;
      } else {
        updates.contacted_at = null;
        updates.contacted_by = null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true, application: current });
    }

    const { data: updated, error: updateError } = await supabase
      .from("dreamscape_builder_applications")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    if (statusChanged) {
      const { error: historyError } = await supabase
        .from("dreamscape_builder_application_status_history")
        .insert({
          application_id: id,
          old_status: current.status,
          new_status: nextStatus,
          changed_by: admin.user.id,
        });

      if (historyError) {
        console.error("Builder status history insert error:", historyError);
      }
    }

    return NextResponse.json({ ok: true, application: updated });
  } catch (error) {
    console.error("Dreamscape Builders admin update error:", error);
    return NextResponse.json(
      { ok: false, error: "Unable to update this application." },
      { status: 500 },
    );
  }
}
