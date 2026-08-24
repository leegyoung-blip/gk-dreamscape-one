import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  ensureDreamscapeStudentProfile,
  getOrInviteDreamscapeLearner,
  normaliseEmail,
  type DreamscapeContractRow,
  type DreamscapePlanRow,
} from "@/lib/dreamscape-subscriptions";
import { stripeTimestampToDate } from "@/lib/stripe";

export type DreamscapeTrialContract = DreamscapeContractRow & {
  intro_trial_eligible?: boolean | null;
  intro_trial_days?: number | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  trial_redeemed_at?: string | null;
  started_at?: string | null;
  cancellation_mode?: string | null;
  cancellation_requested_at?: string | null;
  provider_customer_id?: string | null;
};

export function getDreamscapeStripeTrialWindow(
  subscription: Stripe.Subscription,
) {
  return {
    start: stripeTimestampToDate(subscription.trial_start),
    end: stripeTimestampToDate(subscription.trial_end),
  };
}

export function isDreamscapeIntroTrialSubscription(
  contract: DreamscapeTrialContract,
  subscription: Stripe.Subscription,
) {
  const trial = getDreamscapeStripeTrialWindow(subscription);

  return (
    Boolean(contract.intro_trial_eligible) &&
    Number(contract.intro_trial_days || 0) > 0 &&
    subscription.status === "trialing" &&
    Boolean(trial.end)
  );
}

export async function activateDreamscapeStripeTrialAccess(input: {
  contract: DreamscapeTrialContract;
  plan: DreamscapePlanRow;
  subscription: Stripe.Subscription;
}) {
  const { contract, plan, subscription } = input;
  const trial = getDreamscapeStripeTrialWindow(subscription);

  if (
    !Boolean(contract.intro_trial_eligible) ||
    Number(contract.intro_trial_days || 0) <= 0 ||
    subscription.status !== "trialing" ||
    !trial.end
  ) {
    throw new Error(
      "Stripe subscription is not an eligible Dreamscape introductory trial.",
    );
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const trialStart = trial.start || now;
  const trialEnd = trial.end;
  const trialStartIso = trialStart.toISOString();
  const trialEndIso = trialEnd.toISOString();
  const cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);

  const learner = await getOrInviteDreamscapeLearner({
    learnerEmail: contract.learner_email,
    learnerName: contract.learner_name,
  });

  await ensureDreamscapeStudentProfile(
    learner.id,
    contract.learner_name,
  );

  const { error: accessError } = await supabaseAdmin
    .from("nova_subscriptions")
    .upsert(
      {
        user_id: learner.id,
        plan: plan.plan_code,
        plan_code: plan.plan_code,
        status: "active",
        access_until: trialEndIso,
        billing_cycle: plan.billing_cycle,
        source: "stripe",
        learner_email: normaliseEmail(contract.learner_email),
        learner_name: contract.learner_name,
        paid_at: null,
        access_started_at: trialStartIso,
        cancel_at_period_end: cancelAtPeriodEnd,
        cancellation_requested_at: cancelAtPeriodEnd
          ? contract.cancellation_requested_at || nowIso
          : null,
        revoked_at: null,
        revoke_reason: null,
        dreamscape_contract_id: contract.id,
        billing_provider: "stripe",
        provider_subscription_id: subscription.id,
        billing_status: cancelAtPeriodEnd
          ? "trial_cancel_at_period_end"
          : "trialing",
        current_period_start: trialStartIso,
        current_period_end: trialEndIso,
        next_billing_at: cancelAtPeriodEnd ? null : trialEndIso,
        grace_until: null,
        last_payment_at: null,
        last_payment_amount: null,
        updated_at: nowIso,
      },
      { onConflict: "user_id" },
    );

  if (accessError) {
    throw new Error(
      `Could not activate Dreamscape trial access: ${accessError.message}`,
    );
  }

  const wasNewTrial = !contract.trial_redeemed_at;

  const { error: contractError } = await supabaseAdmin
    .from("dreamscape_subscription_contracts")
    .update({
      learner_user_id: learner.id,
      status: cancelAtPeriodEnd ? "cancel_at_period_end" : "active",
      provider: "stripe",
      provider_subscription_id: subscription.id,
      provider_status: "trialing",
      current_period_start: trialStartIso,
      current_period_end: trialEndIso,
      next_billing_at: cancelAtPeriodEnd ? null : trialEndIso,
      grace_until: null,
      started_at: contract.started_at || trialStartIso,
      trial_started_at: contract.trial_started_at || trialStartIso,
      trial_ends_at: trialEndIso,
      trial_redeemed_at: contract.trial_redeemed_at || nowIso,
      cancel_at_period_end: cancelAtPeriodEnd,
      cancellation_mode: cancelAtPeriodEnd ? "trial_end" : null,
      cancellation_requested_at: cancelAtPeriodEnd
        ? contract.cancellation_requested_at || nowIso
        : null,
      updated_at: nowIso,
    })
    .eq("id", contract.id);

  if (contractError) {
    throw new Error(
      `Trial access was activated but the Dreamscape contract could not be updated: ${contractError.message}`,
    );
  }

  return {
    learnerUserId: learner.id,
    trialStartedAt: trialStartIso,
    trialEndsAt: trialEndIso,
    wasNewTrial,
    cancelAtPeriodEnd,
  };
}
