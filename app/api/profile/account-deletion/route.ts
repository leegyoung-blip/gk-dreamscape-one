import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  cancelDreamscapeStripeSubscriptionImmediately,
  getDreamscapeStripeSubscription,
  isStripeEnvironment,
  releaseDreamscapeStripePlanSchedule,
} from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STAFF_ROLES = new Set([
  "admin",
  "teacher",
  "curriculum-lead",
  "curriculumlead",
]);

const LIVE_CONTRACT_STATUSES = new Set([
  "active",
  "payment_issue",
  "cancel_at_period_end",
  "suspended",
  "setup_pending",
  "checkout_pending",
]);

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function normaliseRole(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isMissingRelationError(
  error: { code?: string | null } | null,
) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

async function requireCurrentUser(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) {
    throw new Error("AUTH_REQUIRED");
  }

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
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
    error,
  } = await client.auth.getUser(token);

  if (error || !user) {
    throw new Error("AUTH_REQUIRED");
  }

  return { user, token };
}

async function loadPreflight(userId: string) {
  const [profileResult, contractResult, organisationResult] =
    await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("role,email")
        .eq("id", userId)
        .maybeSingle(),

      supabaseAdmin
        .from("dreamscape_subscription_contracts")
        .select(
          "id,provider,provider_environment,provider_status,provider_subscription_id,provider_schedule_id,status,pending_plan_id,cancel_at_period_end",
        )
        .eq("learner_user_id", userId)
        .order("updated_at", { ascending: false }),

      supabaseAdmin
        .from("education_organisation_memberships")
        .select("id,organisation_id,membership_role,status")
        .eq("user_id", userId)
        .eq("status", "active"),
    ]);

  if (profileResult.error) {
    throw profileResult.error;
  }

  if (
    contractResult.error &&
    !isMissingRelationError(contractResult.error)
  ) {
    throw contractResult.error;
  }

  if (
    organisationResult.error &&
    !isMissingRelationError(organisationResult.error)
  ) {
    throw organisationResult.error;
  }

  const role = normaliseRole(profileResult.data?.role);
  const contracts = contractResult.error ? [] : contractResult.data || [];
  const activeContracts = contracts.filter((contract) =>
    LIVE_CONTRACT_STATUSES.has(
      String(contract.status || "").trim().toLowerCase(),
    ),
  );
  const organisations = organisationResult.error
    ? []
    : organisationResult.data || [];

  const blockers: string[] = [];

  if (STAFF_ROLES.has(role)) {
    blockers.push(
      "Staff accounts cannot be self-deleted because teaching, curriculum or administration responsibilities must be transferred first. Contact Dreamscape Support.",
    );
  }

  if (organisations.length > 0) {
    blockers.push(
      "This account is still connected to an active education organisation. Ask the organisation administrator or Dreamscape Support to remove the organisation membership first.",
    );
  }

  const activeNonStripe = activeContracts.filter(
    (contract) => contract.provider !== "stripe",
  );

  if (activeNonStripe.length > 0) {
    blockers.push(
      activeNonStripe.some(
        (contract) => contract.provider === "gkp_billing",
      )
        ? "This account has an active Guru Kids Pro-managed membership. Contact Dreamscape Support before deleting the account so the GKP billing and learner record can be closed correctly."
        : "This account has an active legacy non-Stripe Dreamscape membership. Contact Dreamscape Support before deleting the account.",
    );
  }

  const liveStripeContracts = activeContracts.filter(
    (contract) => contract.provider === "stripe",
  );

  return {
    role,
    profileEmail: profileResult.data?.email || null,
    liveStripeContracts,
    activeOrganisationCount: organisations.length,
    blockers,
    canDelete: blockers.length === 0,
  };
}

export async function GET(request: Request) {
  try {
    const { user } = await requireCurrentUser(request);
    const preflight = await loadPreflight(user.id);

    return json({
      canDelete: preflight.canDelete,
      blockers: preflight.blockers,
      role: preflight.role || "regular",
      activeOrganisationCount: preflight.activeOrganisationCount,
      liveStripeSubscriptionCount: preflight.liveStripeContracts.filter(
        (contract) => Boolean(contract.provider_subscription_id),
      ).length,
      hasLiveStripeMembership: preflight.liveStripeContracts.length > 0,
      email: user.email || preflight.profileEmail || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message === "AUTH_REQUIRED") {
      return json({ error: "Please sign in again." }, 401);
    }

    console.error("Dreamscape account deletion preflight failed", error);
    return json({ error: message }, 500);
  }
}

export async function POST(request: Request) {
  let deletionRequestId: string | null = null;

  try {
    const { user, token } = await requireCurrentUser(request);
    const email = String(user.email || "").trim().toLowerCase();

    if (!email) {
      return json(
        {
          error:
            "This account does not have a verified email address. Contact Dreamscape Support to delete it safely.",
        },
        409,
      );
    }

    const body = (await request.json()) as {
      confirmation?: string;
      emailConfirmation?: string;
      acknowledgeImmediateAccessLoss?: boolean;
      acknowledgeNoAutomaticRefund?: boolean;
    };

    if (body.confirmation !== "DELETE") {
      return json(
        { error: 'Type "DELETE" exactly to confirm permanent deletion.' },
        400,
      );
    }

    if (
      String(body.emailConfirmation || "").trim().toLowerCase() !== email
    ) {
      return json(
        { error: "Enter the email address of the account you are deleting." },
        400,
      );
    }

    if (!body.acknowledgeImmediateAccessLoss) {
      return json(
        { error: "Confirm that learning access will end immediately." },
        400,
      );
    }

    if (!body.acknowledgeNoAutomaticRefund) {
      return json(
        {
          error:
            "Confirm that account deletion does not automatically issue a refund.",
        },
        400,
      );
    }

    const preflight = await loadPreflight(user.id);

    if (!preflight.canDelete) {
      return json(
        {
          error:
            preflight.blockers[0] || "This account cannot be self-deleted.",
          blockers: preflight.blockers,
        },
        409,
      );
    }

    const emailHash = createHash("sha256").update(email).digest("hex");
    const requestedAt = new Date().toISOString();

    const { data: deletionRequest, error: requestError } =
      await supabaseAdmin
        .from("dreamscape_account_deletion_requests")
        .insert({
          user_id: user.id,
          email_hash: emailHash,
          status: "processing",
          requested_at: requestedAt,
          metadata: {
            source: "my_profile",
            live_stripe_contracts: preflight.liveStripeContracts.length,
          },
        })
        .select("id")
        .single();

    if (requestError || !deletionRequest) {
      throw (
        requestError ||
        new Error("Could not start the account-deletion request.")
      );
    }

    deletionRequestId = deletionRequest.id;

    // Stop external billing before disabling the login.
    const processedSubscriptionIds = new Set<string>();

    for (const contract of preflight.liveStripeContracts) {
      const subscriptionId = String(
        contract.provider_subscription_id || "",
      ).trim();

      if (!subscriptionId) {
        const nowIso = new Date().toISOString();
        const { error: localOnlyError } = await supabaseAdmin
          .from("dreamscape_subscription_contracts")
          .update({
            status: "cancelled",
            provider_status: "cancelled",
            cancel_at_period_end: false,
            cancellation_mode: "immediate",
            cancellation_requested_at: nowIso,
            cancelled_at: nowIso,
            grace_until: null,
            current_period_end: nowIso,
            next_billing_at: null,
            provider_schedule_id: null,
            updated_at: nowIso,
          })
          .eq("id", contract.id);

        if (localOnlyError) {
          throw localOnlyError;
        }

        continue;
      }

      if (!isStripeEnvironment(contract.provider_environment)) {
        throw new Error(
          "The Stripe environment on this membership is invalid. Contact Dreamscape Support before deleting the account.",
        );
      }

      if (!processedSubscriptionIds.has(subscriptionId)) {
        if (contract.provider_schedule_id) {
          await releaseDreamscapeStripePlanSchedule({
            environment: contract.provider_environment,
            subscriptionId,
            scheduleId: contract.provider_schedule_id,
          });
        }

        const currentSubscription = await getDreamscapeStripeSubscription(
          contract.provider_environment,
          subscriptionId,
        );

        if (String(currentSubscription.status).toLowerCase() !== "canceled") {
          await cancelDreamscapeStripeSubscriptionImmediately({
            environment: contract.provider_environment,
            subscriptionId,
          });
        }

        processedSubscriptionIds.add(subscriptionId);
      }

      const nowIso = new Date().toISOString();
      const { error: contractUpdateError } = await supabaseAdmin
        .from("dreamscape_subscription_contracts")
        .update({
          status: "cancelled",
          provider_status: "canceled",
          cancel_at_period_end: false,
          cancellation_mode: "immediate",
          cancellation_requested_at: nowIso,
          cancelled_at: nowIso,
          paused_at: null,
          grace_until: null,
          current_period_end: nowIso,
          next_billing_at: null,
          provider_schedule_id: null,
          updated_at: nowIso,
        })
        .eq("id", contract.id);

      if (contractUpdateError) {
        throw contractUpdateError;
      }
    }

    // Revoke all refresh sessions before soft-deleting the Auth user.
    const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(
      token,
      "global",
    );

    if (signOutError) {
      throw signOutError;
    }

    // Soft-delete avoids failing on user-owned Storage objects while still
    // preventing the account from signing in again.
    const { error: authDeleteError } =
      await supabaseAdmin.auth.admin.deleteUser(user.id, true);

    if (authDeleteError) {
      throw authDeleteError;
    }

    // Remove/anonymise the user's Dreamscape application data.
    const { data: cleanupResult, error: cleanupError } =
      await supabaseAdmin.rpc("dreamscape_finalize_account_deletion", {
        p_user_id: user.id,
        p_original_email: email,
        p_request_id: deletionRequestId,
      });

    if (cleanupError) {
      await supabaseAdmin
        .from("dreamscape_account_deletion_requests")
        .update({
          status: "needs_review",
          auth_disabled_at: new Date().toISOString(),
          error_message: cleanupError.message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", deletionRequestId);

      return json(
        {
          ok: true,
          deleted: true,
          cleanupPending: true,
          message:
            "Your Dreamscape login has been deleted. A final internal data-cleanup step requires administrator review.",
        },
        202,
      );
    }

    const completedAt = new Date().toISOString();

    await supabaseAdmin
      .from("dreamscape_account_deletion_requests")
      .update({
        status: "completed",
        auth_disabled_at: completedAt,
        completed_at: completedAt,
        deletion_mode: "auth_soft_delete_plus_public_anonymisation",
        metadata: {
          source: "my_profile",
          cleanup: cleanupResult,
        },
        updated_at: completedAt,
      })
      .eq("id", deletionRequestId);

    return json({
      ok: true,
      deleted: true,
      cleanupPending: false,
      message: "Your Dreamscape account has been deleted.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (deletionRequestId) {
      await supabaseAdmin
        .from("dreamscape_account_deletion_requests")
        .update({
          status: "failed",
          error_message: message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", deletionRequestId);
    }

    if (message === "AUTH_REQUIRED") {
      return json({ error: "Please sign in again." }, 401);
    }

    console.error("Dreamscape account deletion failed", error);
    return json({ error: message }, 500);
  }
}
