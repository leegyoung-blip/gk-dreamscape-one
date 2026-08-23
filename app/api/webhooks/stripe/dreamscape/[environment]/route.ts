import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  constructDreamscapeStripeEvent,
  getStripeClient,
  isStripeEnvironment,
  stripeTimestampToDate,
  type DreamscapeStripeEnvironment,
} from "@/lib/stripe";
import { sendDreamscapeSubscriptionEmail } from "@/lib/dreamscapeSubscriptionEmail";
import {
  keepNovaAccessUntilPeriodEnd,
  projectContractToNovaAccess,
  suspendNovaAccess,
  type DreamscapeContractRow,
  type DreamscapePlanRow,
} from "@/lib/dreamscape-subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ environment: string }>;
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function idFromExpandable(value: unknown) {
  if (typeof value === "string") return value;

  if (
    value &&
    typeof value === "object" &&
    "id" in value &&
    typeof (value as { id?: unknown }).id === "string"
  ) {
    return String((value as { id: string }).id);
  }

  return "";
}

function contractIdFromMetadata(
  metadata: Stripe.Metadata | null | undefined,
) {
  return String(metadata?.dreamscape_contract_id || "").trim();
}

function subscriptionIdFromInvoice(invoice: Stripe.Invoice) {
  const legacy = idFromExpandable(
    (invoice as unknown as { subscription?: unknown }).subscription,
  );

  if (legacy) return legacy;

  const parent = (invoice as unknown as {
    parent?: {
      subscription_details?: {
        subscription?: unknown;
      } | null;
    } | null;
  }).parent;

  const current = idFromExpandable(
    parent?.subscription_details?.subscription,
  );

  if (current) return current;

  return "";
}

function invoiceIdFromCharge(charge: Stripe.Charge) {
  return idFromExpandable(
    (charge as unknown as { invoice?: unknown }).invoice,
  );
}

function subscriptionPeriod(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];

  return {
    start: stripeTimestampToDate(item?.current_period_start),
    end: stripeTimestampToDate(item?.current_period_end),
  };
}

async function loadContract(contractId: string) {
  if (!contractId) return null;

  const { data, error } = await supabaseAdmin
    .from("dreamscape_subscription_contracts")
    .select("*")
    .eq("id", contractId)
    .maybeSingle();

  if (error) throw error;
  return data as DreamscapeContractRow | null;
}

async function findContractBySubscription(
  subscription: Stripe.Subscription,
) {
  const metadataContractId = contractIdFromMetadata(
    subscription.metadata,
  );

  if (metadataContractId) {
    const byMetadata = await loadContract(metadataContractId);
    if (byMetadata) return byMetadata;
  }

  const { data, error } = await supabaseAdmin
    .from("dreamscape_subscription_contracts")
    .select("*")
    .eq("provider", "stripe")
    .eq("provider_subscription_id", subscription.id)
    .maybeSingle();

  if (error) throw error;
  return data as DreamscapeContractRow | null;
}

async function loadPlan(planId: string) {
  const { data, error } = await supabaseAdmin
    .from("dreamscape_subscription_plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (error) throw error;
  return data as DreamscapePlanRow;
}

async function retrieveSubscription(
  environment: DreamscapeStripeEnvironment,
  subscriptionId: string,
) {
  const stripe = getStripeClient(environment);
  return stripe.subscriptions.retrieve(subscriptionId);
}

async function findStoredPayment(params: {
  contractId: string;
  environment: DreamscapeStripeEnvironment;
  invoiceId: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("dreamscape_subscription_payments")
    .select("id")
    .eq("contract_id", params.contractId)
    .eq("provider", "stripe")
    .eq("provider_environment", params.environment)
    .eq("provider_charge_id", params.invoiceId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function recordAffiliateCommission(paymentId: string) {
  const { data, error } = await supabaseAdmin.rpc(
    "record_dreamscape_affiliate_commission",
    { p_payment_id: paymentId },
  );

  if (error) {
    throw new Error(
      `Affiliate commission recording failed: ${error.message}`,
    );
  }

  return data;
}

async function applyAffiliateRefund(params: {
  paymentId: string;
  refundedAmount: number;
  eventId: string;
  invoiceId: string;
}) {
  const { error } = await supabaseAdmin.rpc(
    "apply_dreamscape_affiliate_refund",
    {
      p_payment_id: params.paymentId,
      p_refunded_amount: params.refundedAmount,
      p_source_key: `stripe-refund:${params.eventId}`,
      p_metadata: {
        provider: "stripe",
        stripe_event_id: params.eventId,
        stripe_invoice_id: params.invoiceId,
      },
    },
  );

  if (error) {
    throw new Error(
      `Affiliate refund reconciliation failed: ${error.message}`,
    );
  }
}

async function findExistingEvent(
  environment: DreamscapeStripeEnvironment,
  eventId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("dreamscape_subscription_events")
    .select("id,processing_status")
    .eq("provider", "stripe")
    .eq("provider_environment", environment)
    .eq("object_id", eventId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function createEventJournal(params: {
  environment: DreamscapeStripeEnvironment;
  event: Stripe.Event;
  rawPayload: Record<string, unknown>;
}) {
  const existing = await findExistingEvent(
    params.environment,
    params.event.id,
  );

  if (existing?.id) {
    return {
      id: existing.id as string,
      duplicate: true,
      processingStatus: String(existing.processing_status || ""),
    };
  }

  const { data, error } = await supabaseAdmin
    .from("dreamscape_subscription_events")
    .insert({
      provider: "stripe",
      provider_environment: params.environment,
      event_name: params.event.type,
      object_type: String(
        (params.event.data.object as { object?: unknown }).object ||
          params.event.type,
      ),
      object_id: params.event.id,
      processing_status: "received",
      raw_payload: params.rawPayload,
    })
    .select("id")
    .single();

  if (error) throw error;

  return {
    id: String(data.id),
    duplicate: false,
    processingStatus: "received",
  };
}

async function markEvent(
  eventRowId: string,
  input: {
    status: "processed" | "ignored" | "failed";
    contractId?: string | null;
    error?: string | null;
  },
) {
  const { error } = await supabaseAdmin
    .from("dreamscape_subscription_events")
    .update({
      ...(input.contractId
        ? { contract_id: input.contractId }
        : {}),
      processing_status: input.status,
      error_message: input.error || null,
      processed_at: new Date().toISOString(),
    })
    .eq("id", eventRowId);

  if (error) {
    console.error("Could not update Stripe event journal", error);
  }
}

async function syncContractProviderIds(input: {
  contract: DreamscapeContractRow;
  subscription: Stripe.Subscription;
  environment: DreamscapeStripeEnvironment;
  providerData?: Record<string, unknown>;
}) {
  const customerId = idFromExpandable(input.subscription.customer);

  const { error } = await supabaseAdmin
    .from("dreamscape_subscription_contracts")
    .update({
      provider: "stripe",
      provider_environment: input.environment,
      provider_subscription_id: input.subscription.id,
      provider_customer_id: customerId || null,
      provider_status: input.subscription.status,
      provider_data: input.providerData || input.subscription,
      last_provider_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.contract.id);

  if (error) throw error;

  return {
    ...input.contract,
    provider: "stripe",
    provider_environment: input.environment,
    provider_subscription_id: input.subscription.id,
    provider_customer_id: customerId || null,
    provider_status: input.subscription.status,
  } as DreamscapeContractRow;
}

export async function POST(
  request: Request,
  context: Params,
) {
  const { environment: rawEnvironment } = await context.params;

  if (!isStripeEnvironment(rawEnvironment)) {
    return json(
      { ok: false, error: "Invalid Stripe environment." },
      404,
    );
  }

  const environment = rawEnvironment;
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") || "";

  if (!signature) {
    return json(
      { ok: false, error: "Missing Stripe signature." },
      401,
    );
  }

  let event: Stripe.Event;

  try {
    event = constructDreamscapeStripeEvent({
      rawBody,
      signature,
      environment,
    });
  } catch (error) {
    console.error("Dreamscape Stripe signature verification failed", error);
    return json(
      { ok: false, error: "Invalid Stripe signature." },
      401,
    );
  }

  const expectedLivemode = environment === "production";

  if (event.livemode !== expectedLivemode) {
    return json(
      {
        ok: false,
        error: "Stripe event environment does not match this endpoint.",
      },
      400,
    );
  }

  let rawPayload: Record<string, unknown>;

  try {
    rawPayload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    rawPayload = {
      id: event.id,
      type: event.type,
    };
  }

  let eventJournal: Awaited<ReturnType<typeof createEventJournal>>;

  try {
    eventJournal = await createEventJournal({
      environment,
      event,
      rawPayload,
    });
  } catch (error) {
    console.error("Could not journal Dreamscape Stripe event", error);
    return json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not journal Stripe event.",
      },
      500,
    );
  }

  if (
    eventJournal.duplicate &&
    ["processed", "ignored"].includes(
      eventJournal.processingStatus,
    )
  ) {
    return json({
      ok: true,
      duplicate: true,
      event: event.type,
    });
  }

  let matchedContractId: string | null = null;

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const contractId =
        contractIdFromMetadata(session.metadata) ||
        String(session.client_reference_id || "").trim();

      const contract = await loadContract(contractId);

      if (!contract) {
        await markEvent(eventJournal.id, {
          status: "ignored",
          error: "No Dreamscape contract matches the Checkout Session.",
        });

        return json({ ok: true, ignored: true });
      }

      matchedContractId = contract.id;

      const subscriptionId = idFromExpandable(session.subscription);
      const customerId = idFromExpandable(session.customer);

      let providerStatus = String(session.status || "complete");
      let providerData: Record<string, unknown> = {
        checkout_session_id: session.id,
        checkout_status: session.status,
        payment_status: session.payment_status,
        livemode: session.livemode,
      };

      if (subscriptionId) {
        const subscription = await retrieveSubscription(
          environment,
          subscriptionId,
        );

        providerStatus = subscription.status;
        providerData = {
          ...providerData,
          subscription,
        };
      }

      const { error } = await supabaseAdmin
        .from("dreamscape_subscription_contracts")
        .update({
          provider: "stripe",
          provider_environment: environment,
          provider_subscription_id: subscriptionId || null,
          provider_customer_id: customerId || null,
          provider_status: providerStatus,
          provider_data: providerData,
          last_provider_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", contract.id);

      if (error) throw error;
    } else if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const contractId =
        contractIdFromMetadata(session.metadata) ||
        String(session.client_reference_id || "").trim();

      const contract = await loadContract(contractId);

      if (!contract) {
        await markEvent(eventJournal.id, {
          status: "ignored",
          error: "No Dreamscape contract matches the expired Checkout Session.",
        });
        return json({ ok: true, ignored: true });
      }

      matchedContractId = contract.id;

      if (
        contract.status === "setup_pending" &&
        !contract.provider_subscription_id
      ) {
        const { error } = await supabaseAdmin
          .from("dreamscape_subscription_contracts")
          .update({
            status: "failed",
            provider_status: "checkout_expired",
            provider_data: {
              checkout_session_id: session.id,
              checkout_status: session.status,
              payment_status: session.payment_status,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", contract.id);

        if (error) throw error;
      }
    } else if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = subscriptionIdFromInvoice(invoice);

      if (!subscriptionId) {
        await markEvent(eventJournal.id, {
          status: "ignored",
          error: "Paid invoice is not linked to a Stripe subscription.",
        });
        return json({ ok: true, ignored: true });
      }

      const subscription = await retrieveSubscription(
        environment,
        subscriptionId,
      );

      const contract = await findContractBySubscription(subscription);

      if (!contract) {
        await markEvent(eventJournal.id, {
          status: "ignored",
          error: "No Dreamscape contract matches the paid subscription.",
        });
        return json({ ok: true, ignored: true });
      }

      matchedContractId = contract.id;

      const syncedContract = await syncContractProviderIds({
        contract,
        subscription,
        environment,
        providerData: {
          subscription,
          latest_invoice: invoice,
        },
      });

      const plan = await loadPlan(contract.plan_id);
      const paidAt =
        stripeTimestampToDate(invoice.status_transitions?.paid_at) ||
        stripeTimestampToDate(event.created) ||
        new Date();

      const amount = Number(invoice.amount_paid || 0) / 100;
      const currency = String(invoice.currency || plan.currency || "SGD")
        .trim()
        .toUpperCase();

      const { error: paymentError } = await supabaseAdmin
        .from("dreamscape_subscription_payments")
        .upsert(
          {
            contract_id: contract.id,
            provider: "stripe",
            provider_environment: environment,
            provider_charge_id: invoice.id,
            provider_subscription_id: subscription.id,
            plan_id: plan.id,
            amount,
            currency,
            refund_amount: 0,
            status: "succeeded",
            paid_at: paidAt.toISOString(),
            raw_payload: rawPayload,
          },
          {
            onConflict: "provider,provider_charge_id",
            ignoreDuplicates: true,
          },
        );

      if (paymentError) throw paymentError;

      const storedPayment = await findStoredPayment({
        contractId: contract.id,
        environment,
        invoiceId: invoice.id,
      });

      if (!storedPayment?.id) {
        throw new Error(
          "The successful Stripe invoice was stored, but its Dreamscape payment row could not be resolved.",
        );
      }

      const { data: effectivePlanId, error: transitionError } =
        await supabaseAdmin.rpc("gkp_apply_dreamscape_plan_change", {
          p_contract_id: contract.id,
          p_payment_id: storedPayment.id,
          p_amount: amount,
          p_currency: currency,
          p_paid_at: paidAt.toISOString(),
        });

      if (transitionError) {
        throw new Error(
          `Dreamscape plan transition failed: ${transitionError.message}`,
        );
      }

      const effectivePlan =
        effectivePlanId && String(effectivePlanId) !== plan.id
          ? await loadPlan(String(effectivePlanId))
          : plan;

      const { error: paymentPlanSnapshotError } = await supabaseAdmin
        .from("dreamscape_subscription_payments")
        .update({ plan_id: effectivePlan.id })
        .eq("id", storedPayment.id);

      if (paymentPlanSnapshotError) {
        throw new Error(
          `Dreamscape payment plan snapshot failed: ${paymentPlanSnapshotError.message}`,
        );
      }

      const period = subscriptionPeriod(subscription);

      await projectContractToNovaAccess({
        contract: {
          ...syncedContract,
          plan_id: effectivePlan.id,
        },
        plan: effectivePlan,
        providerPayload: rawPayload,
        paidAt,
        periodStart: period.start,
        periodEnd: period.end,
        nextBillingAt: period.end,
      });

      const { error: contractUpdateError } = await supabaseAdmin
        .from("dreamscape_subscription_contracts")
        .update({
          status: subscription.cancel_at_period_end
            ? "cancel_at_period_end"
            : "active",
          provider_status: subscription.status,
          grace_until: null,
          failed_charge_count: 0,
          cancel_at_period_end: subscription.cancel_at_period_end,
          cancellation_mode: subscription.cancel_at_period_end
            ? "period_end"
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contract.id);

      if (contractUpdateError) throw contractUpdateError;

      const commissionId = await recordAffiliateCommission(
        storedPayment.id,
      );

      if (commissionId) {
        console.info("Dreamscape Stripe affiliate commission recorded", {
          contractId: contract.id,
          paymentId: storedPayment.id,
          commissionId,
        });
      }

      await sendDreamscapeSubscriptionEmail({
        contractId: contract.id,
        emailType: contract.first_paid_at
          ? "payment_received"
          : "subscription_started",
        origin:
          process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin,
        eventKey: `stripe-invoice:${invoice.id}`,
      }).catch((emailError) =>
        console.error("Dreamscape Stripe payment email failed", emailError),
      );
    } else if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = subscriptionIdFromInvoice(invoice);

      if (!subscriptionId) {
        await markEvent(eventJournal.id, {
          status: "ignored",
          error: "Failed invoice is not linked to a Stripe subscription.",
        });
        return json({ ok: true, ignored: true });
      }

      const subscription = await retrieveSubscription(
        environment,
        subscriptionId,
      );
      const contract = await findContractBySubscription(subscription);

      if (!contract) {
        await markEvent(eventJournal.id, {
          status: "ignored",
          error: "No Dreamscape contract matches the failed subscription payment.",
        });
        return json({ ok: true, ignored: true });
      }

      matchedContractId = contract.id;

      await syncContractProviderIds({
        contract,
        subscription,
        environment,
        providerData: {
          subscription,
          failed_invoice: invoice,
        },
      });

      const { data: settings, error: settingsError } = await supabaseAdmin
        .from("dreamscape_billing_settings")
        .select("failed_payment_grace_days")
        .eq("id", true)
        .maybeSingle();

      if (settingsError) throw settingsError;

      const graceDays = Number(settings?.failed_payment_grace_days || 7);
      const graceUntil = new Date(
        Date.now() + graceDays * 24 * 60 * 60 * 1000,
      );
      const failedAt = new Date().toISOString();

      const { error: contractError } = await supabaseAdmin
        .from("dreamscape_subscription_contracts")
        .update({
          status: "payment_issue",
          provider_status: subscription.status || "past_due",
          grace_until: graceUntil.toISOString(),
          last_failed_charge_at: failedAt,
          failed_charge_count:
            Number(contract.failed_charge_count || 0) + 1,
          updated_at: failedAt,
        })
        .eq("id", contract.id);

      if (contractError) throw contractError;

      if (contract.learner_user_id) {
        const { error: accessError } = await supabaseAdmin
          .from("nova_subscriptions")
          .update({
            billing_status: "payment_issue",
            grace_until: graceUntil.toISOString(),
            updated_at: failedAt,
          })
          .eq("user_id", contract.learner_user_id)
          .eq("dreamscape_contract_id", contract.id);

        if (accessError) throw accessError;
      }

      await sendDreamscapeSubscriptionEmail({
        contractId: contract.id,
        emailType: "payment_issue",
        origin:
          process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin,
        eventKey: `stripe-payment-failed:${invoice.id}:${event.id}`,
      }).catch((emailError) =>
        console.error(
          "Dreamscape Stripe payment issue email failed",
          emailError,
        ),
      );
    } else if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const contract = await findContractBySubscription(subscription);

      if (!contract) {
        await markEvent(eventJournal.id, {
          status: "ignored",
          error: "No Dreamscape contract matches the updated Stripe subscription.",
        });
        return json({ ok: true, ignored: true });
      }

      matchedContractId = contract.id;
      const syncedContract = await syncContractProviderIds({
        contract,
        subscription,
        environment,
      });
      const period = subscriptionPeriod(subscription);

      if (
        subscription.cancel_at_period_end &&
        period.end &&
        period.end.getTime() > Date.now()
      ) {
        await keepNovaAccessUntilPeriodEnd({
          contract: syncedContract,
          periodEnd: period.end,
        });

        const { error } = await supabaseAdmin
          .from("dreamscape_subscription_contracts")
          .update({
            status: "cancel_at_period_end",
            cancel_at_period_end: true,
            cancellation_mode: "period_end",
            cancellation_requested_at:
              contract.cancellation_requested_at ||
              new Date().toISOString(),
            current_period_end: period.end.toISOString(),
            next_billing_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", contract.id);

        if (error) throw error;
      } else if (
        ["active", "trialing"].includes(subscription.status) &&
        contract.first_paid_at
      ) {
        const { error } = await supabaseAdmin
          .from("dreamscape_subscription_contracts")
          .update({
            status: "active",
            cancel_at_period_end: false,
            cancellation_mode: null,
            grace_until: null,
            current_period_start: period.start?.toISOString() || null,
            current_period_end: period.end?.toISOString() || null,
            next_billing_at: period.end?.toISOString() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", contract.id);

        if (error) throw error;
      } else if (subscription.status === "incomplete_expired") {
        const { error } = await supabaseAdmin
          .from("dreamscape_subscription_contracts")
          .update({
            status: "failed",
            provider_status: subscription.status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", contract.id);

        if (error) throw error;
      }
    } else if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const contract = await findContractBySubscription(subscription);

      if (!contract) {
        await markEvent(eventJournal.id, {
          status: "ignored",
          error: "No Dreamscape contract matches the deleted Stripe subscription.",
        });
        return json({ ok: true, ignored: true });
      }

      matchedContractId = contract.id;

      await suspendNovaAccess({
        contract: {
          ...contract,
          provider_subscription_id: subscription.id,
        },
        reason: "Stripe subscription canceled",
        providerStatus: "canceled",
      });

      const endedAt =
        stripeTimestampToDate(subscription.ended_at)?.toISOString() ||
        new Date().toISOString();

      const { error } = await supabaseAdmin
        .from("dreamscape_subscription_contracts")
        .update({
          status: "cancelled",
          provider: "stripe",
          provider_environment: environment,
          provider_subscription_id: subscription.id,
          provider_customer_id:
            idFromExpandable(subscription.customer) || null,
          provider_status: "canceled",
          cancel_at_period_end: false,
          cancelled_at: endedAt,
          next_billing_at: null,
          provider_data: subscription,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contract.id);

      if (error) throw error;

      await sendDreamscapeSubscriptionEmail({
        contractId: contract.id,
        emailType: "subscription_ended",
        origin:
          process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin,
        eventKey: `stripe-ended:${subscription.id}:${event.id}`,
      }).catch((emailError) =>
        console.error("Dreamscape Stripe ended email failed", emailError),
      );
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const invoiceId = invoiceIdFromCharge(charge);

      if (!invoiceId) {
        await markEvent(eventJournal.id, {
          status: "ignored",
          error: "Refunded Stripe charge is not linked to an invoice.",
        });
        return json({ ok: true, ignored: true });
      }

      const { data: payment, error: paymentError } = await supabaseAdmin
        .from("dreamscape_subscription_payments")
        .select("id,contract_id,amount")
        .eq("provider", "stripe")
        .eq("provider_environment", environment)
        .eq("provider_charge_id", invoiceId)
        .maybeSingle();

      if (paymentError) throw paymentError;

      if (!payment?.id) {
        await markEvent(eventJournal.id, {
          status: "ignored",
          error: `No Dreamscape payment matches Stripe invoice ${invoiceId}.`,
        });
        return json({ ok: true, ignored: true });
      }

      matchedContractId = String(payment.contract_id || "") || null;

      const refundedAmount = Number(charge.amount_refunded || 0) / 100;
      const cappedRefund = Math.min(
        Math.max(refundedAmount, 0),
        Math.max(Number(payment.amount || 0), 0),
      );

      const { error: refundUpdateError } = await supabaseAdmin
        .from("dreamscape_subscription_payments")
        .update({
          refund_amount: cappedRefund,
          raw_payload: rawPayload,
        })
        .eq("id", payment.id);

      if (refundUpdateError) throw refundUpdateError;

      if (cappedRefund > 0) {
        await applyAffiliateRefund({
          paymentId: payment.id,
          refundedAmount: cappedRefund,
          eventId: event.id,
          invoiceId,
        });
      }
    } else {
      await markEvent(eventJournal.id, {
        status: "ignored",
        error: `Unhandled Stripe event type ${event.type}.`,
      });

      return json({
        ok: true,
        ignored: true,
        event: event.type,
      });
    }

    await markEvent(eventJournal.id, {
      status: "processed",
      contractId: matchedContractId,
    });

    return json({
      ok: true,
      event: event.type,
      contractId: matchedContractId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    await markEvent(eventJournal.id, {
      status: "failed",
      contractId: matchedContractId,
      error: message,
    });

    console.error("Dreamscape Stripe webhook failed", {
      eventId: event.id,
      eventType: event.type,
      contractId: matchedContractId,
      error,
    });

    return json({ ok: false, error: message }, 500);
  }
}
