import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for Founding 50 admin route.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const supabase = getAdminSupabase();
    let query = supabase
      .from("founding_50_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Founding 50 admin list error:", error);
      return NextResponse.json({ error: "Unable to load applications." }, { status: 500 });
    }

    return NextResponse.json({ applications: data ?? [] });
  } catch (error) {
    console.error("Founding 50 admin route failed:", error);
    return NextResponse.json({ error: "Unable to load applications." }, { status: 500 });
  }
}
