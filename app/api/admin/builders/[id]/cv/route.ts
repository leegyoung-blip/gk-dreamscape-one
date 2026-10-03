import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient, requireAdmin } from "@/lib/buildersAdminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status });
  }

  try {
    const { id } = await context.params;
    const supabase = getServiceRoleClient();

    const { data: application, error: applicationError } = await supabase
      .from("dreamscape_builder_applications")
      .select("id, cv_path")
      .eq("id", id)
      .single();

    if (applicationError || !application) {
      return NextResponse.json({ ok: false, error: "Application not found." }, { status: 404 });
    }

    if (!application.cv_path) {
      return NextResponse.json(
        { ok: false, error: "No CV / Resume was uploaded for this application." },
        { status: 404 },
      );
    }

    const { data, error } = await supabase.storage
      .from("dreamscape-builder-cvs")
      .createSignedUrl(application.cv_path, 600);

    if (error || !data?.signedUrl) {
      throw error || new Error("Unable to create signed CV URL.");
    }

    return NextResponse.json({ ok: true, signedUrl: data.signedUrl, expiresInSeconds: 600 });
  } catch (error) {
    console.error("Dreamscape Builders CV access error:", error);
    return NextResponse.json(
      { ok: false, error: "Unable to open CV / Resume right now." },
      { status: 500 },
    );
  }
}
