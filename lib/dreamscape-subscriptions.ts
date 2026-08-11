import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type DreamscapePlanCode = "core" | "science" | "complete";
export type DreamscapeBillingCycle = "monthly" | "annual";

export type DreamscapePlanRow = {
  id: string;
  plan_key: string;
  display_name: string;
  plan_code: DreamscapePlanCode;
  billing_cycle: DreamscapeBillingCycle;
  audience: "public" | "gkp";
  amount: number | string;
  currency: string;
  provider: "hitpay" | "gkp_billing";
  is_available: boolean;
  is_coming_soon: boolean;
  hitpay_plan_id: string | null;
  hitpay_environment: string | null;
};

export type DreamscapeContractRow = {
  id: string;
  reference: string;
  plan_id: string;
  parent_name: string;
  parent_email: string;
  learner_name: string;
  learner_email: string;
  learner_user_id: string | null;
  provider: string;
  provider_environment: string | null;
  provider_subscription_id: string | null;
  provider_status: string | null;
  status: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  next_billing_at?: string | null;
  grace_until?: string | null;
  cancel_at_period_end?: boolean;
  cancellation_requested_at?: string | null;
  cancellation_mode?: string | null;
  failed_charge_count?: number;
  first_paid_at?: string | null;
  previous_plan_id?: string | null;
  pending_plan_id?: string | null;
  plan_change_status?: string | null;
  plan_change_effective_at?: string | null;
  plan_change_requested_at?: string | null;
  plan_change_source?: string | null;
  pending_transition_id?: string | null;
  updated_at?: string | null;
};

export function normaliseEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function normaliseText(value: unknown, max = 255) {
  return String(value || "").trim().slice(0, max);
}

export function singaporeDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function addBillingPeriod(
  date: Date,
  cycle: DreamscapeBillingCycle,
) {
  const result = new Date(date);

  if (cycle === "annual") {
    const month = result.getUTCMonth();
    const day = result.getUTCDate();
    result.setUTCDate(1);
    result.setUTCFullYear(result.getUTCFullYear() + 1);
    result.setUTCMonth(month);
    const lastDay = new Date(
      Date.UTC(result.getUTCFullYear(), month + 1, 0),
    ).getUTCDate();
    result.setUTCDate(Math.min(day, lastDay));
    return result;
  }

  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);
  const lastDay = new Date(
    Date.UTC(
      result.getUTCFullYear(),
      result.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export async function findAuthUserByEmail(
  email: string,
): Promise<User | null> {
  for (let page = 1; page <= 20; page += 1) {
    const {
      data: { users },
      error,
    } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw new Error(
        `Could not search Dreamscape users: ${error.message}`,
      );
    }

    const match = users.find(
      (user) => normaliseEmail(user.email) === email,
    );

    if (match) return match;
    if (users.length < 1000) break;
  }

  return null;
}

export async function getOrInviteDreamscapeLearner(input: {
  learnerEmail: string;
  learnerName: string;
}) {
  const learnerEmail = normaliseEmail(input.learnerEmail);
  const existing = await findAuthUserByEmail(learnerEmail);

  if (existing) return existing;

  const redirectTo =
    process.env.DREAMSCAPE_INVITE_REDIRECT_URL ||
    (process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/profile`
      : undefined);

  const { data, error } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(
      learnerEmail,
      {
        data: {
          full_name: input.learnerName || undefined,
          account_source: "hitpay-dreamscape-subscription",
        },
        ...(redirectTo ? { redirectTo } : {}),
      },
    );

  if (error) {
    const retry = await findAuthUserByEmail(learnerEmail);
    if (retry) return retry;

    throw new Error(
      `Could not create/invite learner account: ${error.message}`,
    );
  }

  if (!data.user) {
    throw new Error("Supabase did not return the invited learner.");
  }

  return data.user;
}

export async function ensureDreamscapeStudentProfile(
  userId: string,
  learnerName: string,
) {
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Could not read learner profile: ${error.message}`,
    );
  }

  const role = String(profile?.role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");

  const protectedRoles = new Set([
    "admin",
    "teacher",
    "curriculum-lead",
    "curriculumlead",
  ]);

  if (profile) {
    if (!protectedRoles.has(role) && role !== "student") {
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ role: "student" })
        .eq("id", userId);

      if (updateError) {
        throw new Error(
          `Could not activate learner profile: ${updateError.message}`,
        );
      }
    }
    return;
  }

  const { error: insertError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: userId,
      role: "student",
    });

  if (insertError) {
    throw new Error(
      `Could not create learner profile: ${insertError.message}`,
    );
  }
}

export function extractNestedString(
  payload: Record<string, unknown>,
  path: string[],
) {
  let current: unknown = payload;

  for (const key of path) {
    if (
      !current ||
      typeof current !== "object" ||
      Array.isArray(current)
    ) {
      return "";
    }

    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === "string" ? current.trim() : "";
}

export function extractString(
  payload: Record<string, unknown>,
  keys: string[],
) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

export function extractDate(
  payload: Record<string, unknown>,
  keys: string[],
) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value !== "string" || !value.trim()) continue;
    const date = new Date(value);
    if (Number.isFinite(date.getTime())) return date;
  }
  return null;
}

export async function projectContractToNovaAccess(input: {
  contract: DreamscapeContractRow;
  plan: DreamscapePlanRow;
  providerPayload?: Record<string, unknown>;
  paidAt?: Date | null;
}) {
  const learner = await getOrInviteDreamscapeLearner({
    learnerEmail: input.contract.learner_email,
    learnerName: input.contract.learner_name,
  });

  await ensureDreamscapeStudentProfile(
    learner.id,
    input.contract.learner_name,
  );

  const now = input.paidAt || new Date();
  const payload = input.providerPayload || {};

  const periodEnd =
    extractDate(payload, [
      "current_period_end",
      "period_end",
      "next_billing_at",
      "next_billing_date",
      "next_charge_date",
    ]) || addBillingPeriod(now, input.plan.billing_cycle);

  const periodStart =
    extractDate(payload, [
      "current_period_start",
      "period_start",
      "start_date",
    ]) || now;

  const nextBilling =
    extractDate(payload, [
      "next_billing_at",
      "next_billing_date",
      "next_charge_date",
    ]) || periodEnd;

  const amount = Number(input.plan.amount || 0);

  const { error: subscriptionError } = await supabaseAdmin
    .from("nova_subscriptions")
    .upsert(
      {
        user_id: learner.id,
        plan: input.plan.plan_code,
        plan_code: input.plan.plan_code,
        status: "active",
        access_until: periodEnd.toISOString(),
        billing_cycle: input.plan.billing_cycle,
        source: "hitpay",
        learner_email: normaliseEmail(
          input.contract.learner_email,
        ),
        learner_name: input.contract.learner_name,
        paid_at: (input.paidAt || now).toISOString(),
        access_started_at: periodStart.toISOString(),
        cancel_at_period_end: false,
        cancellation_requested_at: null,
        revoked_at: null,
        revoke_reason: null,
        dreamscape_contract_id: input.contract.id,
        billing_provider: "hitpay",
        provider_subscription_id:
          input.contract.provider_subscription_id,
        billing_status: "active",
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        next_billing_at: nextBilling.toISOString(),
        grace_until: null,
        last_payment_at: input.paidAt
          ? input.paidAt.toISOString()
          : null,
        last_payment_amount: input.paidAt ? amount : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (subscriptionError) {
    throw new Error(
      `Could not activate Dreamscape access: ${subscriptionError.message}`,
    );
  }

  const { error: contractError } = await supabaseAdmin
    .from("dreamscape_subscription_contracts")
    .update({
      learner_user_id: learner.id,
      status: "active",
      provider_status: "active",
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      next_billing_at: nextBilling.toISOString(),
      grace_until: null,
      started_at: periodStart.toISOString(),
      first_paid_at: input.paidAt
        ? input.paidAt.toISOString()
        : undefined,
      last_successful_charge_at: input.paidAt
        ? input.paidAt.toISOString()
        : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.contract.id);

  if (contractError) {
    throw new Error(
      `Access was activated but contract state could not be updated: ${contractError.message}`,
    );
  }

  return {
    learnerUserId: learner.id,
    accessUntil: periodEnd.toISOString(),
  };
}

export async function suspendNovaAccess(input: {
  contract: DreamscapeContractRow;
  reason: string;
  providerStatus?: string | null;
}) {
  if (input.contract.learner_user_id) {
    await supabaseAdmin
      .from("nova_subscriptions")
      .update({
        status: "revoked",
        billing_status: input.providerStatus || input.reason,
        revoked_at: new Date().toISOString(),
        revoke_reason: input.reason,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", input.contract.learner_user_id)
      .eq("dreamscape_contract_id", input.contract.id);
  }

  await supabaseAdmin
    .from("dreamscape_subscription_contracts")
    .update({
      status: "suspended",
      provider_status: input.providerStatus || input.reason,
      cancelled_at:
        input.providerStatus === "cancelled"
          ? new Date().toISOString()
          : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.contract.id);
}


export async function keepNovaAccessUntilPeriodEnd(input: {
  contract: DreamscapeContractRow;
  periodEnd: Date;
}) {
  if (!input.contract.learner_user_id) return;

  await supabaseAdmin
    .from("nova_subscriptions")
    .update({
      status: "active",
      access_until: input.periodEnd.toISOString(),
      cancel_at_period_end: true,
      cancellation_requested_at: new Date().toISOString(),
      billing_status: "cancel_at_period_end",
      current_period_end: input.periodEnd.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", input.contract.learner_user_id)
    .eq("dreamscape_contract_id", input.contract.id);
}
