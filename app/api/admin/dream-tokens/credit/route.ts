import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Admin Dream Token adjustments (credit and debit).
 *
 * Security model:
 * - The caller's bearer token is verified server-side and the caller must
 *   have profiles.role = 'admin'. Nothing from the browser is trusted.
 * - The signed amount and ledger title are derived here from the action,
 *   matching the Admin Dream Tokens page exactly.
 * - The ledger row is written by public.admin_adjust_dream_tokens (service
 *   role only), which re-checks the admin and target, records the acting
 *   admin and enforces idempotency on request_id in one transaction.
 *   The existing balance trigger on dream_token_transactions is unchanged.
 */

type AdminTokenAction = "class_attendance" | "manual_add" | "manual_deduct";

const CLASS_ATTENDANCE_AMOUNT = 100;

// Largest value that fits the smallest integer type a ledger amount column may
// use (int4). This is a database safety bound, not a business limit.
const MAX_ADMIN_DREAM_TOKEN_ADJUSTMENT = 2_147_483_647;

const ACTION_TITLES: Record<AdminTokenAction, string> = {
  class_attendance: "Class Attendance Reward",
  manual_add: "Admin Manual Add",
  manual_deduct: "Admin Manual Deduct",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isAdminTokenAction(value: unknown): value is AdminTokenAction {
  return (
    value === "class_attendance" ||
    value === "manual_add" ||
    value === "manual_deduct"
  );
}

function resolveSignedAmount(action: AdminTokenAction, amount: unknown) {
  if (action === "class_attendance") return CLASS_ATTENDANCE_AMOUNT;

  if (
    typeof amount !== "number" ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    amount > MAX_ADMIN_DREAM_TOKEN_ADJUSTMENT
  ) {
    return null;
  }

  return action === "manual_deduct" ? -amount : amount;
}

async function verifyAdmin(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) {
    return { ok: false as const, status: 401, error: "Authentication required." };
  }

  const adminClient = createAdminClient();

  const {
    data: { user },
    error: userError,
  } = await adminClient.auth.getUser(token);

  if (userError || !user) {
    return { ok: false as const, status: 401, error: "Invalid session." };
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false as const, status: 500, error: "Could not verify admin access." };
  }

  if (String(profile?.role || "").trim().toLowerCase() !== "admin") {
    return { ok: false as const, status: 403, error: "Admin access only." };
  }

  return { ok: true as const, adminClient, adminUserId: user.id };
}

function mapAdjustmentError(error: { code?: string; message?: string }) {
  const code = error.code || "";
  const message = error.message || "";

  if (code === "PGRST202" || code === "42883") {
    return {
      status: 503,
      error:
        "Dream Token adjustments are unavailable until the Phase 2A-3B-2A database migration is applied.",
    };
  }
  if (code === "42501") return { status: 403, error: "Admin access only." };
  if (code === "P0002") return { status: 404, error: "Target account not found." };
  if (message.includes("IDEMPOTENCY_KEY_REUSED")) {
    return {
      status: 409,
      error: "This request id was already used for a different adjustment.",
    };
  }
  if (code === "22023" || code === "22003") {
    return { status: 400, error: "Invalid Dream Token amount." };
  }
  return { status: 500, error: "Dream Tokens could not be updated." };
}

export async function POST(request: Request) {
  try {
    const access = await verifyAdmin(request);

    if (!access.ok) {
      return json({ error: access.error }, access.status);
    }

    const body = (await request.json().catch(() => null)) as {
      userId?: unknown;
      action?: unknown;
      amount?: unknown;
      requestId?: unknown;
    } | null;

    if (!body || typeof body !== "object") {
      return json({ error: "Invalid request body." }, 400);
    }

    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const requestId =
      typeof body.requestId === "string" ? body.requestId.trim() : "";

    if (!UUID_PATTERN.test(userId)) {
      return json({ error: "A valid target account is required." }, 400);
    }

    if (!UUID_PATTERN.test(requestId)) {
      return json({ error: "A valid request id is required." }, 400);
    }

    if (!isAdminTokenAction(body.action)) {
      return json({ error: "Invalid Dream Token action." }, 400);
    }

    const signedAmount = resolveSignedAmount(body.action, body.amount);

    if (signedAmount === null) {
      return json(
        {
          error: `Dream Token amount must be a whole number between 1 and ${MAX_ADMIN_DREAM_TOKEN_ADJUSTMENT}.`,
        },
        400,
      );
    }

    const { adminClient, adminUserId } = access;

    const { data: target, error: targetError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (targetError) {
      return json({ error: "Could not verify the target account." }, 500);
    }

    if (!target) {
      return json({ error: "Target account not found." }, 404);
    }

    const { data, error } = await adminClient.rpc("admin_adjust_dream_tokens", {
      p_request_id: requestId,
      p_admin_user_id: adminUserId,
      p_target_user_id: userId,
      p_amount: signedAmount,
      p_title: ACTION_TITLES[body.action],
      p_action: body.action,
    });

    if (error) {
      const mapped = mapAdjustmentError(error);
      if (mapped.status >= 500) {
        console.error("Admin Dream Token adjustment failed", {
          code: error.code,
          requestId,
        });
      }
      return json({ error: mapped.error }, mapped.status);
    }

    const result = (Array.isArray(data) ? data[0] : data) as {
      duplicate?: unknown;
      new_balance?: unknown;
    } | null;

    const newBalance = Number(result?.new_balance);

    return json({
      success: true,
      duplicate: Boolean(result?.duplicate),
      amount: signedAmount,
      newBalance: Number.isFinite(newBalance) ? newBalance : null,
    });
  } catch (error) {
    console.error("Admin Dream Token adjustment error", error);
    return json({ error: "Dream Tokens could not be updated." }, 500);
  }
}
