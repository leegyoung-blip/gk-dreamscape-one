import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment variables.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return { ok: false, error: "Missing auth token.", adminClient: null };
  }

  const adminClient = createSupabaseAdminClient();

  const {
    data: { user },
    error: userError,
  } = await adminClient.auth.getUser(token);

  if (userError || !user) {
    return { ok: false, error: "Invalid auth token.", adminClient: null };
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false, error: profileError.message, adminClient: null };
  }

  if (profile?.role?.trim().toLowerCase() !== "admin") {
    return { ok: false, error: "Admin access only.", adminClient: null };
  }

  return { ok: true, error: null, adminClient };
}

function getTransactionType(amount: number): "earn" | "spend" {
  return amount < 0 ? "spend" : "earn";
}

export async function POST(req: NextRequest) {
  try {
    const { userId, amount, title } = await req.json();

    const finalAmount = Number(amount);

    if (!userId) {
      return NextResponse.json(
        { error: "Missing student user ID." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(finalAmount) || finalAmount === 0) {
      return NextResponse.json(
        { error: "Invalid token amount." },
        { status: 400 }
      );
    }

    const result = await verifyAdmin(req);

    if (!result.ok || !result.adminClient) {
      return NextResponse.json(
        { error: result.error || "Admin access denied." },
        { status: 401 }
      );
    }

    const adminClient = result.adminClient;

    const { data: selectedProfile, error: selectedProfileError } =
      await adminClient
        .from("profiles")
        .select("id, email, role")
        .eq("id", userId)
        .eq("role", "student")
        .maybeSingle();

    if (selectedProfileError) {
      return NextResponse.json(
        { error: selectedProfileError.message },
        { status: 500 }
      );
    }

    if (!selectedProfile) {
      return NextResponse.json(
        { error: "Student profile not found." },
        { status: 404 }
      );
    }

    const { error: insertError } = await adminClient
      .from("dream_token_transactions")
      .insert({
        user_id: userId,
        amount: finalAmount,
        token_kind: "virtual",
        type: getTransactionType(finalAmount),
        title: title || "Dream Token Update",
      });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error." },
      { status: 500 }
    );
  }
}