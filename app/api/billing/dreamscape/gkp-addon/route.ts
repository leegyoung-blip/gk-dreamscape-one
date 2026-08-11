import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  ensureDreamscapeStudentProfile,
  getOrInviteDreamscapeLearner,
  normaliseEmail,
} from "@/lib/dreamscape-subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AddonPlan = "none" | "core" | "complete";

type SupabaseLikeError = {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Supabase/PostgREST errors are not always JavaScript Error instances.
 * String(error) can therefore become "[object Object]".
 *
 * This converts the useful Supabase fields into a readable message.
 */
function readableError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const value = error as SupabaseLikeError;

    const parts = [
      typeof value.message === "string" && value.message
        ? value.message
        : "",
      typeof value.details === "string" && value.details
        ? `Details: ${value.details}`
        : "",
      typeof value.hint === "string" && value.hint
        ? `Hint: ${value.hint}`
        : "",
      typeof value.code === "string" && value.code
        ? `Code: ${value.code}`
        : "",
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(" | ");
    }

    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown server error.";
    }
  }

  return String(error);
}

async function requireBillingStaff(request: Request) {
  const authHeader =
    request.headers.get("authorization") || "";

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) {
    throw new Error("AUTH_REQUIRED");
  }

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_AUTH_CONFIG_MISSING");
  }

  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser(token);

  if (userError || !user) {
    throw new Error("AUTH_REQUIRED");
  }

  const {
    data: allowed,
    error: permissionError,
  } = await client.rpc("gkp_is_billing_staff");

  if (permissionError) {
    throw permissionError;
  }

  if (!allowed) {
    throw new Error("ACCESS_DENIED");
  }

  return user;
}

function monthStart(value: string) {
  const date = new Date(
    `${value}T00:00:00+08:00`,
  );

  if (!Number.isFinite(date.getTime())) {
    throw new Error(
      "Invalid Dreamscape add-on start date.",
    );
  }

  const formatter = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Singapore",
      year: "numeric",
      month: "2-digit",
    },
  );

  const parts = formatter.formatToParts(date);

  const map = Object.fromEntries(
    parts.map((part) => [
      part.type,
      part.value,
    ]),
  );

  return `${map.year}-${map.month}-01`;
}

export async function POST(request: Request) {
  let step = "authorising billing staff";

  try {
    // =========================================================
    // 1. AUTHORISE STAFF
    // =========================================================

    const staff =
      await requireBillingStaff(request);

    // =========================================================
    // 2. READ REQUEST
    // =========================================================

    step = "reading request";

    const body = (await request.json()) as {
      studentId?: string;
      planCode?: AddonPlan;
      learnerEmail?: string;
      startsOn?: string;
      firstMonthFree?: boolean;
    };

    const studentId = String(
      body.studentId || "",
    ).trim();

    const planCode =
      body.planCode || "none";

    const learnerEmail =
      normaliseEmail(body.learnerEmail);

    const startsOn = String(
      body.startsOn || "",
    ).trim();

    if (!studentId) {
      return json(
        {
          error: "studentId is required.",
        },
        400,
      );
    }

    // =========================================================
    // 3. LOAD GKP STUDENT
    // =========================================================

    step = "loading GKP student";

    const {
      data: student,
      error: studentError,
    } = await supabaseAdmin
      .from("gkp_billing_students")
      .select(
        "id,account_id,full_name,preferred_name,status,dreamscape_user_id",
      )
      .eq("id", studentId)
      .single();

    if (studentError) {
      throw studentError;
    }

    if (!student) {
      return json(
        {
          error: "GKP student not found.",
        },
        404,
      );
    }

    // =========================================================
    // 4. LOAD EXISTING DREAMSCAPE ADD-ON
    // =========================================================

    step =
      "loading existing Dreamscape add-on";

    const {
      data: existingAddon,
      error: addonError,
    } = await supabaseAdmin
      .from("gkp_dreamscape_student_addons")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle();

    if (addonError) {
      throw addonError;
    }

    // =========================================================
    // 5. END EXISTING ADD-ON
    // =========================================================

    if (planCode === "none") {
      if (!existingAddon) {
        return json({
          ok: true,
          status: "none",
        });
      }

      step =
        "ending Dreamscape add-on";

      const endedAt =
        new Date().toISOString();

      const {
        error: endError,
      } = await supabaseAdmin
        .from(
          "gkp_dreamscape_student_addons",
        )
        .update({
          status: "ended",
          ends_on: endedAt.slice(0, 10),
          updated_by: staff.id,
          updated_at: endedAt,
        })
        .eq("id", existingAddon.id);

      if (endError) {
        throw endError;
      }

      const userId =
        existingAddon.dreamscape_user_id ||
        student.dreamscape_user_id;

      if (userId) {
        step =
          "revoking Nova access";

        const {
          error: revokeError,
        } = await supabaseAdmin
          .from("nova_subscriptions")
          .update({
            status: "revoked",
            revoked_at: endedAt,
            revoke_reason:
              "GKP Dreamscape add-on ended",
            billing_status: "ended",
            updated_at: endedAt,
          })
          .eq("user_id", userId)
          .eq("source", "gkp_billing");

        if (revokeError) {
          throw revokeError;
        }
      }

      return json({
        ok: true,
        status: "ended",
      });
    }

    // =========================================================
    // 6. VALIDATE PLAN
    // =========================================================

    if (
      !["core", "complete"].includes(
        planCode,
      )
    ) {
      return json(
        {
          error:
            "Invalid GKP Dreamscape plan.",
        },
        400,
      );
    }

    if (!learnerEmail || !startsOn) {
      return json(
        {
          error:
            "Learner Dreamscape email and start date are required.",
        },
        400,
      );
    }

    // Validate date before any writes.
    monthStart(startsOn);

    // =========================================================
    // 7. VERIFY ACTIVE GKP ENROLMENT
    // =========================================================

    step =
      "checking active GKP enrolment";

    const {
      count: activeEnrolmentCount,
      error: enrolmentError,
    } = await supabaseAdmin
      .from("gkp_billing_enrolments")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("student_id", studentId)
      .eq("status", "active");

    if (enrolmentError) {
      throw enrolmentError;
    }

    if (
      (activeEnrolmentCount || 0) === 0
    ) {
      return json(
        {
          error:
            "This student needs at least one active GKP programme enrolment before GKP-priced Dreamscape access can be activated.",
        },
        409,
      );
    }

    // =========================================================
    // 8. FIND OR CREATE DREAMSCAPE LEARNER
    // =========================================================

    step =
      "finding or inviting Dreamscape learner";

    const learner =
      await getOrInviteDreamscapeLearner({
        learnerEmail,
        learnerName:
          student.preferred_name ||
          student.full_name,
      });

    // =========================================================
    // 9. ENSURE STUDENT PROFILE
    // =========================================================

    step =
      "preparing Dreamscape student profile";

    await ensureDreamscapeStudentProfile(
      learner.id,
      student.preferred_name ||
        student.full_name,
    );

    // =========================================================
    // 10. BLOCK PUBLIC/GKP DOUBLE BILLING
    // =========================================================

    step =
      "checking for public Dreamscape subscription";

    const {
      data: conflictingContract,
      error: conflictError,
    } = await supabaseAdmin
      .from(
        "dreamscape_subscription_contracts",
      )
      .select("id,status")
      .eq("learner_user_id", learner.id)
      .in("status", [
        "active",
        "payment_issue",
        "cancel_at_period_end",
        "setup_pending",
      ])
      .limit(1)
      .maybeSingle();

    if (conflictError) {
      throw conflictError;
    }

    if (conflictingContract) {
      return json(
        {
          error:
            "This learner already has a public Dreamscape subscription. End or resolve it before applying GKP student pricing.",
        },
        409,
      );
    }

    // =========================================================
    // 11. CALCULATE GKP PRICE + FREE MONTH
    // =========================================================

    const monthlyFee =
      planCode === "complete"
        ? 14.9
        : 9.9;

    const freeAlreadyUsed = Boolean(
      existingAddon?.free_month_used_at,
    );

    const applyFreeMonth =
      Boolean(body.firstMonthFree) &&
      !freeAlreadyUsed;

    const complimentaryThroughPeriod =
      applyFreeMonth
        ? monthStart(startsOn)
        : null;

    // =========================================================
    // 12. SAVE GKP DREAMSCAPE ADD-ON
    // =========================================================

    step =
      "saving GKP Dreamscape add-on";

    const {
      data: addon,
      error: saveError,
    } = await supabaseAdmin
      .from(
        "gkp_dreamscape_student_addons",
      )
      .upsert(
        {
          student_id: studentId,
          plan_code: planCode,
          monthly_fee: monthlyFee,
          status: "active",
          learner_email: learnerEmail,
          dreamscape_user_id: learner.id,
          starts_on: startsOn,
          ends_on: null,

          first_month_free:
            applyFreeMonth ||
            Boolean(
              existingAddon?.first_month_free,
            ),

          complimentary_through_period:
            complimentaryThroughPeriod ||
            existingAddon
              ?.complimentary_through_period ||
            null,

          free_month_used_at:
            applyFreeMonth
              ? new Date().toISOString()
              : existingAddon
                  ?.free_month_used_at ||
                null,

          created_by:
            existingAddon?.created_by ||
            staff.id,

          updated_by: staff.id,
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict: "student_id",
        },
      )
      .select("*")
      .single();

    if (saveError) {
      throw saveError;
    }

    // =========================================================
    // 13. LINK GKP STUDENT TO DREAMSCAPE USER
    // =========================================================

    step =
      "linking GKP student to Dreamscape account";

    const {
      error: studentLinkError,
    } = await supabaseAdmin
      .from("gkp_billing_students")
      .update({
        dreamscape_user_id: learner.id,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", studentId);

    if (studentLinkError) {
      throw studentLinkError;
    }

    // =========================================================
    // 14. ACTIVATE NOVA SUBSCRIPTION ACCESS
    // =========================================================

    step =
      "updating Nova subscription access";

    const accessStartedAt = new Date(
      `${startsOn}T00:00:00+08:00`,
    );

    if (
      !Number.isFinite(
        accessStartedAt.getTime(),
      )
    ) {
      throw new Error(
        "Invalid Dreamscape access start date.",
      );
    }

    const {
      error: accessError,
    } = await supabaseAdmin
      .from("nova_subscriptions")
      .upsert(
        {
          user_id: learner.id,

          plan: planCode,
          plan_code: planCode,

          status: "active",
          access_until: null,

          billing_cycle: "monthly",
          source: "gkp_billing",

          learner_email:
            learnerEmail,

          learner_name:
            student.preferred_name ||
            student.full_name,

          paid_at: null,

          access_started_at:
            accessStartedAt.toISOString(),

          cancel_at_period_end: false,
          cancellation_requested_at: null,

          revoked_at: null,
          revoke_reason: null,

          dreamscape_contract_id: null,

          billing_provider:
            "gkp_billing",

          provider_subscription_id: null,

          billing_status: "active",

          current_period_start: null,
          current_period_end: null,
          next_billing_at: null,
          grace_until: null,

          last_payment_at: null,
          last_payment_amount: null,

          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        },
      );

    if (accessError) {
      throw accessError;
    }

    // =========================================================
    // 15. SUCCESS
    // =========================================================

    return json({
      ok: true,
      status: "active",
      addon,
    });
  } catch (error) {
    const message =
      readableError(error);

    if (
      message === "AUTH_REQUIRED"
    ) {
      return json(
        {
          error:
            "Please sign in again.",
        },
        401,
      );
    }

    if (
      message === "ACCESS_DENIED"
    ) {
      return json(
        {
          error:
            "Billing staff access required.",
        },
        403,
      );
    }

    console.error(
      "GKP Dreamscape add-on update failed",
      {
        step,
        message,
        rawError: error,
      },
    );

    return json(
      {
        error:
          `Dreamscape add-on failed while ${step}: ${message}`,
      },
      500,
    );
  }
}
