import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  constructCreatorPackStripeEvent,
  expandableId,
  getChargeForDispute,
  getPaymentIntentChargeId,
} from "@/lib/creator-pack-stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function creatorPackOrderIdFromMetadata(
  metadata: Stripe.Metadata | null | undefined,
) {
  if (String(metadata?.dreamscape_kind || "") !== "creator_pack") {
    return "";
  }

  return String(
    metadata?.dreamscape_creator_pack_order_id || "",
  ).trim();
}

async function claimEvent(input: {
  event: Stripe.Event;
  orderId?: string | null;
}) {
  const payloadSummary = {
    object_id:
      typeof input.event.data.object === "object" &&
      input.event.data.object &&
      "id" in input.event.data.object
        ? String(
            (input.event.data.object as { id?: string }).id || "",
          )
        : "",
  };

  const { data, error } = await supabaseAdmin
    .from("creator_pack_stripe_events")
    .insert({
      stripe_event_id: input.event.id,
      event_type: input.event.type,
      livemode: input.event.livemode,
      order_id: input.orderId || null,
      processing_status: "received",
      payload_summary: payloadSummary,
      received_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id, processing_status")
    .single();

  if (!error) {
    return {
      shouldProcess: true,
      rowId: data.id as string,
    };
  }

  if (error.code !== "23505") {
    throw error;
  }

  const { data: existing, error: existingError } =
    await supabaseAdmin
      .from("creator_pack_stripe_events")
      .select("id, processing_status")
      .eq("stripe_event_id", input.event.id)
      .single();

  if (existingError) throw existingError;

  if (
    existing.processing_status === "processed" ||
    existing.processing_status === "ignored"
  ) {
    return {
      shouldProcess: false,
      rowId: existing.id as string,
    };
  }

  const { error: retryError } = await supabaseAdmin
    .from("creator_pack_stripe_events")
    .update({
      processing_status: "received",
      error_message: null,
      order_id: input.orderId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (retryError) throw retryError;

  return {
    shouldProcess: true,
    rowId: existing.id as string,
  };
}

async function finishEvent(input: {
  rowId: string;
  status: "processed" | "ignored" | "failed";
  orderId?: string | null;
  error?: string | null;
  summary?: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin
    .from("creator_pack_stripe_events")
    .update({
      processing_status: input.status,
      order_id: input.orderId || null,
      error_message: input.error || null,
      payload_summary: input.summary || {},
      processed_at:
        input.status === "processed" || input.status === "ignored"
          ? new Date().toISOString()
          : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.rowId);

  if (error) throw error;
}

async function finalizeCheckoutSession(input: {
  session: Stripe.Checkout.Session;
  event: Stripe.Event;
  environment: "sandbox" | "production";
}) {
  const orderId = creatorPackOrderIdFromMetadata(
    input.session.metadata,
  );

  if (!orderId) {
    return {
      handled: false,
      orderId: null,
      summary: {
        reason: "not_creator_pack",
      },
    };
  }

  const paymentIntentId = expandableId(
    input.session.payment_intent as
      | string
      | Stripe.PaymentIntent
      | null,
  );

  if (!paymentIntentId) {
    throw new Error(
      "Paid Creator Pack Checkout Session has no PaymentIntent ID.",
    );
  }

  const chargeId = await getPaymentIntentChargeId({
    environment: input.environment,
    paymentIntentId,
  });

  const { data, error } = await supabaseAdmin.rpc(
    "stripe_finalize_creator_pack_order",
    {
      p_order_id: orderId,
      p_environment: input.environment,
      p_checkout_session_id: input.session.id,
      p_payment_intent_id: paymentIntentId,
      p_customer_id: expandableId(
        input.session.customer as
          | string
          | Stripe.Customer
          | Stripe.DeletedCustomer
          | null,
      ),
      p_event_id: input.event.id,
      p_amount_subtotal_cents:
        input.session.amount_subtotal ?? input.session.amount_total ?? 0,
      p_amount_discount_cents:
        input.session.total_details?.amount_discount ?? 0,
      p_amount_tax_cents:
        input.session.total_details?.amount_tax ?? 0,
      p_amount_total_cents: input.session.amount_total ?? 0,
      p_currency: String(input.session.currency || "").toUpperCase(),
      p_provider_data: {
        checkout_status: input.session.status,
        payment_status: input.session.payment_status,
        livemode: input.session.livemode,
        charge_id: chargeId || null,
      },
    },
  );

  if (error) throw error;

  if (chargeId) {
    await supabaseAdmin
      .from("creator_quiz_pack_orders")
      .update({
        provider_charge_id: chargeId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
  }

  const result = Array.isArray(data) ? data[0] : data;

  return {
    handled: true,
    orderId,
    summary: {
      order_status: result?.order_status || "paid",
      payment_intent_id: paymentIntentId,
      charge_id: chargeId || null,
      amount_total: input.session.amount_total ?? 0,
      currency: input.session.currency || null,
    },
  };
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return json(
      {
        error: "Missing Stripe signature.",
      },
      400,
    );
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  let environment: "sandbox" | "production";

  try {
    const constructed = await constructCreatorPackStripeEvent({
      rawBody,
      signature,
    });

    event = constructed.event;
    environment = constructed.environment;
  } catch (error) {
    console.error(
      "Creator Pack Stripe webhook signature verification failed",
      errorText(error),
    );

    return json(
      {
        error: "Invalid Stripe webhook signature.",
      },
      400,
    );
  }

  let initialOrderId = "";

  if (
    event.type.startsWith("checkout.session.") &&
    event.data.object.object === "checkout.session"
  ) {
    initialOrderId = creatorPackOrderIdFromMetadata(
      (event.data.object as Stripe.Checkout.Session).metadata,
    );
  }

  let claimed: {
    shouldProcess: boolean;
    rowId: string;
  };

  try {
    claimed = await claimEvent({
      event,
      orderId: initialOrderId || null,
    });
  } catch (error) {
    console.error(
      "Creator Pack Stripe event claim failed",
      event.id,
      errorText(error),
    );

    return json(
      {
        error: "Unable to register Stripe event.",
      },
      500,
    );
  }

  if (!claimed.shouldProcess) {
    return json({
      received: true,
      duplicate: true,
    });
  }

  try {
    let handled = false;
    let orderId: string | null = initialOrderId || null;
    let summary: Record<string, unknown> = {};

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        if (
          creatorPackOrderIdFromMetadata(session.metadata) &&
          session.mode === "payment"
        ) {
          /*
           * checkout.session.completed can represent a delayed method whose
           * payment isn't paid yet. Fulfill only when Stripe says paid.
           * async_payment_succeeded will arrive later for delayed success.
           */
          if (session.payment_status === "paid") {
            const result = await finalizeCheckoutSession({
              session,
              event,
              environment,
            });

            handled = result.handled;
            orderId = result.orderId;
            summary = result.summary;
          } else {
            handled = true;
            orderId =
              creatorPackOrderIdFromMetadata(session.metadata) || null;
            summary = {
              payment_status: session.payment_status,
              note: "Checkout completed but payment is not paid yet.",
            };
          }
        }
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        const creatorOrderId =
          creatorPackOrderIdFromMetadata(session.metadata);

        if (creatorOrderId) {
          const { error } = await supabaseAdmin.rpc(
            "stripe_cancel_creator_pack_order",
            {
              p_order_id: creatorOrderId,
              p_reason: "payment_failed",
            },
          );

          if (error) throw error;

          handled = true;
          orderId = creatorOrderId;
          summary = {
            payment_status: session.payment_status,
            checkout_session_id: session.id,
          };
        }
        break;
      }

      case "checkout.session.expired": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        const creatorOrderId =
          creatorPackOrderIdFromMetadata(session.metadata);

        if (creatorOrderId) {
          const { error } = await supabaseAdmin.rpc(
            "stripe_cancel_creator_pack_order",
            {
              p_order_id: creatorOrderId,
              p_reason: "checkout_expired",
            },
          );

          if (error) throw error;

          handled = true;
          orderId = creatorOrderId;
          summary = {
            checkout_session_id: session.id,
            checkout_status: session.status,
          };
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = expandableId(
          charge.payment_intent as
            | string
            | Stripe.PaymentIntent
            | null,
        );

        if (paymentIntentId) {
          const { error } = await supabaseAdmin.rpc(
            "stripe_apply_creator_pack_refund",
            {
              p_payment_intent_id: paymentIntentId,
              p_charge_id: charge.id,
              p_event_id: event.id,
              p_amount_refunded_cents: charge.amount_refunded,
              p_currency: String(charge.currency || "").toUpperCase(),
            },
          );

          if (error) throw error;

          handled = true;
          summary = {
            payment_intent_id: paymentIntentId,
            charge_id: charge.id,
            amount_refunded: charge.amount_refunded,
            charge_amount: charge.amount,
          };
        }
        break;
      }

      case "charge.dispute.created":
      case "charge.dispute.closed": {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId = expandableId(
          (dispute as Stripe.Dispute & {
            charge?: string | Stripe.Charge | null;
          }).charge,
        );

        if (chargeId) {
          const charge = await getChargeForDispute({
            environment,
            chargeId,
          });

          const paymentIntentId = expandableId(
            charge?.payment_intent as
              | string
              | Stripe.PaymentIntent
              | null,
          );

          if (paymentIntentId) {
            if (event.type === "charge.dispute.created") {
              const { error } = await supabaseAdmin.rpc(
                "stripe_apply_creator_pack_dispute_created",
                {
                  p_payment_intent_id: paymentIntentId,
                  p_charge_id: chargeId,
                  p_dispute_id: dispute.id,
                  p_event_id: event.id,
                },
              );

              if (error) throw error;
            } else {
              const { error } = await supabaseAdmin.rpc(
                "stripe_apply_creator_pack_dispute_closed",
                {
                  p_payment_intent_id: paymentIntentId,
                  p_dispute_id: dispute.id,
                  p_dispute_status: String(dispute.status || ""),
                  p_event_id: event.id,
                },
              );

              if (error) throw error;
            }

            handled = true;
            summary = {
              payment_intent_id: paymentIntentId,
              charge_id: chargeId,
              dispute_id: dispute.id,
              dispute_status: dispute.status,
            };
          }
        }
        break;
      }

      default:
        break;
    }

    await finishEvent({
      rowId: claimed.rowId,
      status: handled ? "processed" : "ignored",
      orderId,
      summary: {
        event_type: event.type,
        environment,
        ...summary,
      },
    });

    return json({
      received: true,
      handled,
    });
  } catch (error) {
    const message = errorText(error);

    try {
      await finishEvent({
        rowId: claimed.rowId,
        status: "failed",
        orderId: initialOrderId || null,
        error: message,
        summary: {
          event_type: event.type,
          environment,
        },
      });
    } catch (logError) {
      console.error(
        "Creator Pack Stripe failed-event logging also failed",
        event.id,
        errorText(logError),
      );
    }

    console.error(
      "Creator Pack Stripe webhook processing failed",
      {
        eventId: event.id,
        eventType: event.type,
        error: message,
      },
    );

    /*
     * Returning 500 tells Stripe to retry.
     * The event row remains FAILED and our claim logic allows a retry.
     */
    return json(
      {
        error: "Creator Pack Stripe webhook processing failed.",
      },
      500,
    );
  }
}
