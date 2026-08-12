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
    throw new Error(
      "SUPABASE_AUTH_CONFIG_MISSING",
    );
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
  } = await client.rpc(
    "gkp_is_billing_staff",
  );

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

  const formatter =
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Singapore",
      year: "numeric",
      month: "2-digit",
    });

  const parts =
    formatter.formatToParts(date);

  const map = Object.fromEntries(
    parts.map((part) => [
      part.type,
      part.value,
    ]),
  );

  return `${map.year}-${map.month}-01`;
}

function singaporeStartInstant(value: string) {
  const date = new Date(
    `${value}T00:00:00+08:00`,
  );

  if (!Number.isFinite(date.getTime())) {
    throw new Error(
      "Invalid Dreamscape access start date.",
    );
  }

  return date;
}

export async function POST(
  request: Request,
) {
  let step =
    "authorising billing staff";

  try {
    const staff =
      await requireBillingStaff(request);

    step = "reading request";

    const body =
      (await request.json()) as {
        studentId?: string;
        planCode?: AddonPlan;
        learnerEmail?: string;
        startsOn?: string;

        /*
         * New name used by the updated Billing Accounts UI.
         */
        waiveStartMonth?: boolean;

        /*
         * Backward-compatible fallback for an older deployed
         * Billing Accounts client.
         */
        firstMonthFree?: boolean;
      };

    const studentId = String(
      body.studentId || "",
    ).trim();

    const planCode =
      body.planCode || "none";

    const learnerEmail =
      normaliseEmail(
        body.learnerEmail,
      );

    const startsOn = String(
      body.startsOn || "",
    ).trim();

    if (!studentId) {
      return json(
        {
          error:
            "studentId is required.",
        },
        400,
      );
    }

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
          error:
            "GKP student not found.",
        },
        404,
      );
    }

    step =
      "loading existing Dreamscape add-on";

    const {
      data: existingAddon,
      error: addonError,
    } = await supabaseAdmin
      .from(
        "gkp_dreamscape_student_addons",
      )
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle();

    if (addonError) {
      throw addonError;
    }

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
          ends_on:
            endedAt.slice(0, 10),
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
          .eq(
            "source",
            "gkp_billing",
          );

        if (revokeError) {
          throw revokeError;
        }
      }

      return json({
        ok: true,
        status: "ended",
      });
    }

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

    if (
      !learnerEmail ||
      !startsOn
    ) {
      return json(
        {
          error:
            "Learner Dreamscape email and start date are required.",
        },
        400,
      );
    }

    /*
     * Validate the selected date before any database writes.
     */
    const accessStartedAt =
      singaporeStartInstant(
        startsOn,
      );

    const startBillingMonth =
      monthStart(startsOn);

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

    step =
      "finding or inviting Dreamscape learner";

    const learner =
      await getOrInviteDreamscapeLearner({
        learnerEmail,
        learnerName:
          student.preferred_name ||
          student.full_name,
      });

    step =
      "preparing Dreamscape student profile";

    await ensureDreamscapeStudentProfile(
      learner.id,
      student.preferred_name ||
        student.full_name,
    );

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
      .eq(
        "learner_user_id",
        learner.id,
      )
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

    /*
     * GKP BILLING RULE
     * ----------------
     *
     * Core = $9.90 per calendar month
     * Full = $14.90 per calendar month
     *
     * There is NO daily proration.
     *
     * If starts_on falls anywhere inside a calendar month,
     * that calendar month is billed at the full monthly rate.
     *
     * Staff may optionally waive the start month. The existing
     * database column complimentary_through_period is retained
     * for compatibility with the invoice-generation SQL:
     *
     *   null          -> bill the full start month
     *   YYYY-MM-01    -> skip that one start month
     *
     * Billing then resumes automatically the following month.
     */
    const monthlyFee =
      planCode === "complete"
        ? 14.9
        : 9.9;

    const waiveStartMonth =
      Boolean(
        body.waiveStartMonth ??
          body.firstMonthFree ??
          false,
      );

    const complimentaryThroughPeriod =
      waiveStartMonth
        ? startBillingMonth
        : null;

    step =
      "saving GKP Dreamscape add-on";

    const nowIso =
      new Date().toISOString();

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
          monthly_fee:
            monthlyFee,
          status: "active",
          learner_email:
            learnerEmail,
          dreamscape_user_id:
            learner.id,
          starts_on: startsOn,
          ends_on: null,

          /*
           * Legacy column names retained for database compatibility.
           * Semantically these now represent an optional start-month
           * billing waiver rather than an automatic free first month.
           */
          first_month_free:
            waiveStartMonth,

          complimentary_through_period:
            complimentaryThroughPeriod,

          /*
           * Keep an audit timestamp when a waiver has been granted.
           * When no waiver is selected, retain any previous historical
           * timestamp but do not let it control billing.
           */
          free_month_used_at:
            waiveStartMonth
              ? nowIso
              : existingAddon
                  ?.free_month_used_at ||
                null,

          created_by:
            existingAddon
              ?.created_by ||
            staff.id,

          updated_by:
            staff.id,

          updated_at:
            nowIso,
        },
        {
          onConflict:
            "student_id",
        },
      )
      .select("*")
      .single();

    if (saveError) {
      throw saveError;
    }

    step =
      "linking GKP student to Dreamscape account";

    const {
      error: studentLinkError,
    } = await supabaseAdmin
      .from(
        "gkp_billing_students",
      )
      .update({
        dreamscape_user_id:
          learner.id,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", studentId);

    if (studentLinkError) {
      throw studentLinkError;
    }

    /*
     * The subscription row is allowed to exist immediately,
     * but central entitlement logic now checks access_started_at.
     *
     * Therefore:
     *
     * starts_on = 18 Aug
     * 12-17 Aug -> no learner entitlement
     * 18 Aug+    -> Core/Full entitlement automatically works
     *
     * No cron job or manual activation is required.
     */
    step =
      "updating Nova subscription access";

    const {
      error: accessError,
    } = await supabaseAdmin
      .from("nova_subscriptions")
      .upsert(
        {
          user_id:
            learner.id,

          plan: planCode,
          plan_code:
            planCode,

          status: "active",
          access_until: null,

          billing_cycle:
            "monthly",

          source:
            "gkp_billing",

          learner_email:
            learnerEmail,

          learner_name:
            student.preferred_name ||
            student.full_name,

          paid_at: null,

          access_started_at:
            accessStartedAt.toISOString(),

          cancel_at_period_end:
            false,

          cancellation_requested_at:
            null,

          revoked_at: null,
          revoke_reason: null,

          dreamscape_contract_id:
            null,

          billing_provider:
            "gkp_billing",

          provider_subscription_id:
            null,

          billing_status:
            "active",

          current_period_start:
            null,

          current_period_end:
            null,

          next_billing_at:
            null,

          grace_until: null,

          last_payment_at:
            null,

          last_payment_amount:
            null,

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

    return json({
      ok: true,
      status: "active",
      addon,
      accessStartsOn:
        accessStartedAt.toISOString(),
      startMonthBilling:
        waiveStartMonth
          ? "waived"
          : "full_month",
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
