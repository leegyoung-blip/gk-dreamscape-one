import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  isHitPayEnvironment,
  validateHitPayWebhookSignature,
  type HitPayEnvironment,
} from "@/lib/hitpay";
import { sendDreamscapeSubscriptionEmail } from "@/lib/dreamscapeSubscriptionEmail";
import {
  extractDate,
  extractNestedString,
  extractString,
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

function dreamscapeWebhookSalt(environment: HitPayEnvironment) {
  const dedicated =
    environment === "production"
      ? process.env.HITPAY_DREAMSCAPE_PRODUCTION_WEBHOOK_SALT
      : process.env.HITPAY_DREAMSCAPE_SANDBOX_WEBHOOK_SALT;

  if (dedicated) return dedicated;

  // Deliberately do not silently reuse another endpoint's per-webhook salt.
  throw new Error(
    `Missing Dreamscape ${environment} HitPay webhook salt.`,
  );
}

function eventNameFromHeaders(request: Request) {
  const object = String(
    request.headers.get("hitpay-event-object") || "",
  )
    .trim()
    .toLowerCase();

  const type = String(
    request.headers.get("hitpay-event-type") || "",
  )
    .trim()
    .toLowerCase();

  return {
    object,
    type,
    name:
      object && type
        ? `${object}.${type}`
        : object || type || "unknown",
  };
}

async function findContract(
  payload: Record<string, unknown>,
  eventObject: string,
) {
  const reference = extractString(payload, [
    "reference",
    "reference_number",
  ]);

  const providerSubscriptionId =
    eventObject === "recurring_billing"
      ? extractString(payload, ["id"])
      : extractString(payload, [
          "recurring_billing_id",
          "subscription_id",
        ]);

  let query = supabaseAdmin
    .from("dreamscape_subscription_contracts")
    .select("*");

  if (providerSubscriptionId) {
    const { data } = await query
      .eq("provider_subscription_id", providerSubscriptionId)
      .maybeSingle();

    if (data) return data as DreamscapeContractRow;
  }

  if (reference) {
    const { data } = await supabaseAdmin
      .from("dreamscape_subscription_contracts")
      .select("*")
      .eq("reference", reference)
      .maybeSingle();

    if (data) return data as DreamscapeContractRow;
  }

  if (eventObject === "charge") {
    const customerEmail = extractNestedString(payload, [
      "customer",
      "email",
    ]).toLowerCase();

    const amount = Number(payload.amount || 0);

    const currency = String(payload.currency || "")
      .trim()
      .toUpperCase();

    if (customerEmail) {
      const { data: candidates } = await supabaseAdmin
        .from("dreamscape_subscription_contracts")
        .select(
          "*,dreamscape_subscription_plans!inner(amount,currency)",
        )
        .eq("parent_email", customerEmail)
        .in("status", [
          "setup_pending",
          "active",
          "payment_issue",
          "cancel_at_period_end",
        ])
        .order("created_at", { ascending: false })
        .limit(20);

      const matching = (candidates || []).filter((row) => {
        const plan = Array.isArray(
          row.dreamscape_subscription_plans,
        )
          ? row.dreamscape_subscription_plans[0]
          : row.dreamscape_subscription_plans;

        return (
          Math.abs(Number(plan?.amount || 0) - amount) < 0.001 &&
          String(plan?.currency || "").toUpperCase() === currency
        );
      });

      if (matching.length === 1) {
        return matching[0] as DreamscapeContractRow;
      }
    }
  }

  return null;
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

/**
 * Find the permanent subscription-payment row after the HitPay charge
 * has been stored.
 *
 * Normally we use the HitPay charge ID, which is the safest lookup.
 *
 * The fallback exists only for the unlikely case where the webhook
 * payload has no charge ID.
 */
async function findStoredPayment(params: {
  contractId: string;
  environment: HitPayEnvironment;
  providerChargeId: string | null;
  amount: number;
  currency: string;
  paidAt: Date;
}) {
  const {
    contractId,
    environment,
    providerChargeId,
    amount,
    currency,
    paidAt,
  } = params;

  if (providerChargeId) {
    const { data, error } = await supabaseAdmin
      .from("dreamscape_subscription_payments")
      .select("id")
      .eq("provider", "hitpay")
      .eq("provider_charge_id", providerChargeId)
      .maybeSingle();

    if (error) throw error;

    if (data?.id) {
      return data;
    }
  }

  const { data, error } = await supabaseAdmin
    .from("dreamscape_subscription_payments")
    .select("id")
    .eq("contract_id", contractId)
    .eq("provider", "hitpay")
    .eq("provider_environment", environment)
    .eq("status", "succeeded")
    .eq("amount", amount)
    .eq("currency", currency)
    .eq("paid_at", paidAt.toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data;
}

/**
 * Phase 4:
 * Convert a successful Dreamscape subscription payment into an
 * affiliate commission ledger record where applicable.
 *
 * The database function is idempotent:
 * one payment can have at most one commission ledger row.
 *
 * A non-affiliate subscription legitimately returns null.
 */
async function recordAffiliateCommission(paymentId: string) {
  const { data, error } = await supabaseAdmin.rpc(
    "record_dreamscape_affiliate_commission",
    {
      p_payment_id: paymentId,
    },
  );

  if (error) {
    throw new Error(
      `Affiliate commission recording failed: ${error.message}`,
    );
  }

  return data;
}

export async function POST(
  request: Request,
  context: Params,
) {
  const { environment: rawEnvironment } = await context.params;

  if (!isHitPayEnvironment(rawEnvironment)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid HitPay environment.",
      },
      {
        status: 404,
      },
    );
  }

  const environment = rawEnvironment;

  const rawBody = await request.text();

  const signature =
    request.headers.get("hitpay-signature") || "";

  let salt = "";

  try {
    salt = dreamscapeWebhookSalt(environment);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        ok: false,
        error: "Webhook is not configured.",
      },
      {
        status: 500,
      },
    );
  }

  if (
    !signature ||
    !validateHitPayWebhookSignature({
      rawBody,
      signature,
      salt,
    })
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid HitPay signature.",
      },
      {
        status: 401,
      },
    );
  }

  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON payload.",
      },
      {
        status: 400,
      },
    );
  }

  const event = eventNameFromHeaders(request);

  const objectId = extractString(payload, ["id"]);

  const { data: eventRow, error: eventInsertError } =
    await supabaseAdmin
      .from("dreamscape_subscription_events")
      .insert({
        provider: "hitpay",
        provider_environment: environment,
        event_name: event.name,
        object_type: event.object || null,
        object_id: objectId || null,
        processing_status: "received",
        raw_payload: payload,
      })
      .select("id")
      .single();

  if (eventInsertError) {
    console.error(
      "Could not journal Dreamscape HitPay event",
      eventInsertError,
    );
  }

  try {
    const contract = await findContract(
      payload,
      event.object,
    );

    if (!contract) {
      if (eventRow?.id) {
        await supabaseAdmin
          .from("dreamscape_subscription_events")
          .update({
            processing_status: "ignored",
            error_message:
              "No Dreamscape contract could be safely matched.",
            processed_at: new Date().toISOString(),
          })
          .eq("id", eventRow.id);
      }

      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "No matching Dreamscape contract.",
      });
    }

    const plan = await loadPlan(contract.plan_id);

    const providerStatus = extractString(
      payload,
      ["status"],
    ).toLowerCase();

    // =========================================================
    // RECURRING SUBSCRIPTION UPDATED
    // =========================================================

    if (
      event.name ===
      "recurring_billing.subscription_updated"
    ) {
      await supabaseAdmin
        .from("dreamscape_subscription_contracts")
        .update({
          provider_status: providerStatus || null,
          provider_data: payload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contract.id);

      if (providerStatus === "active") {
        await projectContractToNovaAccess({
          contract: {
            ...contract,
            provider_status: "active",
          },
          plan,
          providerPayload: payload,
        });
      } else if (
        ["cancelled", "canceled"].includes(
          providerStatus,
        ) &&
        Boolean(contract.cancel_at_period_end) &&
        contract.current_period_end
      ) {
        const periodEnd = new Date(
          contract.current_period_end,
        );

        if (
          Number.isFinite(periodEnd.getTime()) &&
          periodEnd.getTime() > Date.now()
        ) {
          await keepNovaAccessUntilPeriodEnd({
            contract,
            periodEnd,
          });

          await supabaseAdmin
            .from("dreamscape_subscription_contracts")
            .update({
              status: "cancel_at_period_end",
              provider_status: providerStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", contract.id);
        } else {
          await suspendNovaAccess({
            contract,
            reason: `HitPay subscription ${providerStatus}`,
            providerStatus,
          });
        }
      } else if (
        [
          "inactive",
          "paused",
          "cancelled",
          "canceled",
          "expired",
        ].includes(providerStatus)
      ) {
        await suspendNovaAccess({
          contract,
          reason: `HitPay subscription ${providerStatus}`,
          providerStatus,
        });

        await sendDreamscapeSubscriptionEmail({
          contractId: contract.id,
          emailType: "subscription_ended",
          origin: new URL(request.url).origin,
          eventKey:
            `provider-ended:${providerStatus}:` +
            `${objectId || eventRow?.id || "unknown"}`,
        }).catch((emailError) =>
          console.error(
            "Dreamscape ended email failed",
            emailError,
          ),
        );
      }

      // =======================================================
      // PAYMENT METHOD ATTACHED
      // =======================================================
    } else if (
      event.name ===
      "recurring_billing.method_attached"
    ) {
      await supabaseAdmin
        .from("dreamscape_subscription_contracts")
        .update({
          provider_status:
            providerStatus || "method_attached",
          provider_data: payload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contract.id);

      // =======================================================
      // PAYMENT METHOD DETACHED
      // =======================================================
    } else if (
      event.name ===
      "recurring_billing.method_detached"
    ) {
      const graceDaysResult = await supabaseAdmin
        .from("dreamscape_billing_settings")
        .select("failed_payment_grace_days")
        .eq("id", true)
        .maybeSingle();

      const graceDays = Number(
        graceDaysResult.data?.failed_payment_grace_days ||
          7,
      );

      const graceUntil = new Date(
        Date.now() +
          graceDays * 24 * 60 * 60 * 1000,
      );

      await supabaseAdmin
        .from("dreamscape_subscription_contracts")
        .update({
          status: "payment_issue",
          provider_status:
            providerStatus || "method_detached",
          grace_until: graceUntil.toISOString(),
          last_failed_charge_at:
            new Date().toISOString(),
          failed_charge_count:
            Number(
              (
                contract as DreamscapeContractRow & {
                  failed_charge_count?: number;
                }
              ).failed_charge_count || 0,
            ) + 1,
          provider_data: payload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contract.id);

      if (contract.learner_user_id) {
        await supabaseAdmin
          .from("nova_subscriptions")
          .update({
            billing_status: "payment_issue",
            grace_until: graceUntil.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq(
            "user_id",
            contract.learner_user_id,
          );
      }

      await sendDreamscapeSubscriptionEmail({
        contractId: contract.id,
        emailType: "payment_issue",
        origin: new URL(request.url).origin,
        eventKey:
          `method-detached:` +
          `${
            objectId ||
            eventRow?.id ||
            graceUntil.toISOString()
          }`,
      }).catch((emailError) =>
        console.error(
          "Dreamscape payment issue email failed",
          emailError,
        ),
      );

      // =======================================================
      // SUCCESSFUL CHARGE
      // =======================================================
    } else if (event.name === "charge.created") {
      const chargeStatus = String(
        payload.status || "",
      )
        .trim()
        .toLowerCase();

      if (chargeStatus === "succeeded") {
        const paidAt =
          extractDate(payload, [
            "closed_at",
            "created_at",
          ]) || new Date();

        const amount = Number(
          payload.amount || plan.amount || 0,
        );

        const currency = String(
          payload.currency ||
            plan.currency ||
            "SGD",
        ).toUpperCase();

        // -----------------------------------------------------
        // 1. Store payment idempotently.
        // -----------------------------------------------------

        const { error: paymentError } =
          await supabaseAdmin
            .from(
              "dreamscape_subscription_payments",
            )
            .upsert(
              {
                contract_id: contract.id,
                provider: "hitpay",
                provider_environment: environment,
                provider_charge_id:
                  objectId || null,
                provider_subscription_id:
                  contract.provider_subscription_id,
                amount,
                currency,
                status: "succeeded",
                paid_at: paidAt.toISOString(),
                raw_payload: payload,
              },
              {
                onConflict:
                  "provider,provider_charge_id",
                ignoreDuplicates: true,
              },
            );

        if (paymentError) {
          throw paymentError;
        }

        // -----------------------------------------------------
        // 2. Retrieve the permanent payment row.
        //
        // This works for both:
        // - the first webhook delivery, and
        // - HitPay retry deliveries where the upsert was ignored.
        // -----------------------------------------------------

        const storedPayment =
          await findStoredPayment({
            contractId: contract.id,
            environment,
            providerChargeId:
              objectId || null,
            amount,
            currency,
            paidAt,
          });

        if (!storedPayment?.id) {
          throw new Error(
            "The successful HitPay charge was stored, but its Dreamscape payment row could not be resolved.",
          );
        }

        // -----------------------------------------------------
        // 3. Phase 4 affiliate commission processing.
        //
        // The database function decides:
        //
        // - no affiliate -> no commission
        // - monthly payment #1 -> ineligible
        // - monthly payment #2+ -> commission
        // - annual payment -> commission
        // - inactive affiliate -> ineligible
        //
        // The payment_id unique constraint prevents duplicates.
        // -----------------------------------------------------

        const commissionId =
          await recordAffiliateCommission(
            storedPayment.id,
          );

        if (commissionId) {
          console.info(
            "Dreamscape affiliate commission recorded",
            {
              contractId: contract.id,
              paymentId: storedPayment.id,
              commissionId,
            },
          );
        }

        // -----------------------------------------------------
        // 4. Existing Nova subscription projection.
        // -----------------------------------------------------

        await projectContractToNovaAccess({
          contract,
          plan,
          providerPayload: payload,
          paidAt,
        });

        // -----------------------------------------------------
        // 5. Existing contract state update.
        // -----------------------------------------------------

        await supabaseAdmin
          .from(
            "dreamscape_subscription_contracts",
          )
          .update({
            status: "active",
            provider_status: "active",
            grace_until: null,
            failed_charge_count: 0,
            cancel_at_period_end: false,
            cancellation_mode: null,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", contract.id);

        // -----------------------------------------------------
        // 6. Existing subscription/payment email.
        // -----------------------------------------------------

        await sendDreamscapeSubscriptionEmail({
          contractId: contract.id,
          emailType: contract.first_paid_at
            ? "payment_received"
            : "subscription_started",
          origin: new URL(request.url).origin,
          eventKey:
            `charge:${
              objectId ||
              paidAt.toISOString()
            }`,
        }).catch((emailError) =>
          console.error(
            "Dreamscape payment email failed",
            emailError,
          ),
        );
      }
    }

    // =========================================================
    // EVENT JOURNAL COMPLETE
    // =========================================================

    if (eventRow?.id) {
      await supabaseAdmin
        .from("dreamscape_subscription_events")
        .update({
          contract_id: contract.id,
          processing_status: "processed",
          processed_at:
            new Date().toISOString(),
        })
        .eq("id", eventRow.id);
    }

    return NextResponse.json({
      ok: true,
      event: event.name,
      contractId: contract.id,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    if (eventRow?.id) {
      await supabaseAdmin
        .from("dreamscape_subscription_events")
        .update({
          processing_status: "failed",
          error_message: message,
          processed_at:
            new Date().toISOString(),
        })
        .eq("id", eventRow.id);
    }

    console.error(
      "Dreamscape HitPay webhook failed",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      {
        status: 500,
      },
    );
  }
}
