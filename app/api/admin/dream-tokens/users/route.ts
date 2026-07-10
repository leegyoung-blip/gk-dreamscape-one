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

  const role = profile?.role?.trim().toLowerCase();

  if (role !== "admin") {
    return { ok: false, error: "Admin access only.", adminClient: null };
  }

  return { ok: true, error: null, adminClient };
}

export async function GET(req: NextRequest) {
  try {
    const result = await verifyAdmin(req);

    if (!result.ok || !result.adminClient) {
      return NextResponse.json(
        { error: result.error || "Admin access denied." },
        { status: 401 }
      );
    }

    const adminClient = result.adminClient;

    const { data: profiles, error: profilesError } = await adminClient
      .from("profiles")
      .select("id, email, role, created_at")
      .order("created_at", { ascending: false });

    if (profilesError) {
      return NextResponse.json(
        { error: profilesError.message },
        { status: 500 }
      );
    }

    const studentProfiles = (profiles || []).filter((profile) => {
      const role = profile.role?.trim().toLowerCase();
      return role !== "admin";
    });

    const userIds = studentProfiles.map((profile) => profile.id);

    let tokenRows: {
      user_id: string;
      amount: number;
      token_kind: string;
    }[] = [];

    if (userIds.length > 0) {
      const { data: transactions, error: tokenError } = await adminClient
        .from("dream_token_transactions")
        .select("user_id, amount, token_kind")
        .eq("token_kind", "virtual")
        .in("user_id", userIds);

      if (tokenError) {
        return NextResponse.json(
          { error: tokenError.message },
          { status: 500 }
        );
      }

      tokenRows = transactions || [];
    }

    const users = studentProfiles.map((profile) => {
      const dreamTokenBalance = tokenRows
        .filter((transaction) => transaction.user_id === profile.id)
        .reduce((total, transaction) => total + Number(transaction.amount), 0);

      return {
        id: profile.id,
        email: profile.email,
        role: profile.role || "student",
        created_at: profile.created_at,
        dreamTokenBalance,
      };
    });

    return NextResponse.json({
      users,
      debug: {
        totalProfiles: profiles?.length || 0,
        totalStudentProfiles: studentProfiles.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error." },
      { status: 500 }
    );
  }
}