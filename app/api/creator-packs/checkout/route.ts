import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  createCreatorPackStripeCheckout,
} from "@/lib/creator-pack-stripe";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PreparedOrder = {
  order_id: string;
  reuse_existing: boolean;
  provider_checkout_id: string | null;
  pack_id: string;
  pack_title: string;
  pack_slug: string;
  club_slug: string;
  currency: string;
  price_cents: number;
  creator_share_percent_snapshot: number;
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

async function prepareOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  packId: string,
) {
  const { data, error } = await supabase.rpc(
    "creator_prepare_quiz_pack_checkout",
    {
      p_pack_id: packId,
    },
  );

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return (row || null) as PreparedOrder | null;
}

async function cancelOrder(orderId: string, reason: string) {
  await supabaseAdmin.rpc("stripe_cancel_creator_pack_order", {
    p_order_id: orderId,
    p_reason: reason,
  });
}

export async function POST(request: Request) {
  let orderId: string | null = null;

  try {
    const supabase = await createClient();
    const userResponse = await supabase.auth.getUser();
    const user = userResponse.data.user;

    if (!user) {
      return json(
        {
          error: "Log in before purchasing a premium quiz pack.",
          code: "LOGIN_REQUIRED",
        },
        401,
      );
    }

    const body = (await request.json()) as {
      packId?: string;
    };

    const packId = String(body.packId || "").trim();

    if (!packId) {
      return json(
        {
          error: "Premium pack ID is required.",
        },
        400,
      );
    }

    let prepared = await prepareOrder(supabase, packId);

    if (!prepared) {
      return json(
        {
          error: "Unable to prepare premium pack checkout.",
        },
        400,
      );
    }

    orderId = prepared.order_id;

    const environment = "production" as const;

    /*
     * If a previous open Checkout exists, reuse it rather than creating
     * multiple pay-able sessions for the same user + pack.
     */
    const existingCheckoutSessionId =
      prepared.provider_checkout_id;

    if (
      prepared.reuse_existing &&
      existingCheckoutSessionId
    ) {
      const existingPrepared = prepared;

      try {
        const stripe = getStripeClient("production");
        const existingSession =
          await stripe.checkout.sessions.retrieve(
            existingCheckoutSessionId,
          );

        if (
          existingSession.status === "open" &&
          existingSession.url
        ) {
          return json({
            ok: true,
            orderId: existingPrepared.order_id,
            redirectUrl: existingSession.url,
            reused: true,
            environment,
          });
        }
      } catch (error) {
        console.warn(
          "Could not reuse existing Creator Pack Stripe Checkout Session",
          {
            orderId: existingPrepared.order_id,
            checkoutSessionId:
              existingCheckoutSessionId,
            error:
              error instanceof Error
                ? error.message
                : String(error),
          },
        );
      }

      await cancelOrder(
        existingPrepared.order_id,
        "stale_checkout",
      );

      prepared = await prepareOrder(supabase, packId);

      if (!prepared) {
        throw new Error(
          "Unable to prepare a replacement premium pack checkout.",
        );
      }

      orderId = prepared.order_id;
    }

    if (prepared.reuse_existing && !prepared.provider_checkout_id) {
      /*
       * A request may have died after creating the local order but before
       * attaching Stripe. Cancel that incomplete record and retry cleanly.
       */
      await cancelOrder(prepared.order_id, "incomplete_checkout");
      prepared = await prepareOrder(supabase, packId);

      if (!prepared) {
        throw new Error(
          "Unable to prepare a new premium pack checkout.",
        );
      }

      orderId = prepared.order_id;
    }

    const email = String(user.email || "").trim();

    if (!email) {
      await cancelOrder(prepared.order_id, "missing_email");
      return json(
        {
          error:
            "Your Dreamscape account needs a verified email before checkout.",
        },
        400,
      );
    }

    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      new URL(request.url).origin
    ).replace(/\/$/, "");

    const packPath =
      `/milo-world/quiz-hall/clubs/${encodeURIComponent(
        prepared.club_slug,
      )}` +
      `/packs/${encodeURIComponent(prepared.pack_slug)}`;

    const successUrl =
      `${siteUrl}${packPath}` +
      `?checkout=success` +
      `&session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl =
      `${siteUrl}${packPath}` +
      `?checkout=cancelled`;

    const session = await createCreatorPackStripeCheckout({
      orderId: prepared.order_id,
      packId: prepared.pack_id,
      packTitle: prepared.pack_title,
      creatorDisplayName: null,
      clubSlug: prepared.club_slug,
      packSlug: prepared.pack_slug,
      userId: user.id,
      customerEmail: email,
      currency: prepared.currency,
      priceCents: Number(prepared.price_cents),
      successUrl,
      cancelUrl,
    });

    const providerCustomerId =
      typeof session.customer === "string"
        ? session.customer
        : null;

    const expiresAt =
      typeof session.expires_at === "number"
        ? new Date(session.expires_at * 1000).toISOString()
        : null;

    const { error: attachError } = await supabaseAdmin.rpc(
      "stripe_attach_creator_pack_checkout",
      {
        p_order_id: prepared.order_id,
        p_environment: environment,
        p_checkout_session_id: session.id,
        p_customer_id: providerCustomerId,
        p_expires_at: expiresAt,
        p_provider_data: {
          checkout_status: session.status,
          payment_status: session.payment_status,
          livemode: session.livemode,
        },
      },
    );

    if (attachError) {
      throw attachError;
    }

    return json({
      ok: true,
      orderId: prepared.order_id,
      redirectUrl: session.url,
      reused: false,
      environment,
    });
  } catch (error) {
    if (orderId) {
      await cancelOrder(orderId, "checkout_creation_failed");
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unable to start premium pack checkout.";

    const status =
      /already own/i.test(message) ? 409 :
      /log in/i.test(message) ? 401 :
      /not currently open|not currently available|aged 13/i.test(message)
        ? 403
        : 500;

    console.error("Creator Pack Stripe checkout failed", {
      orderId,
      error: message,
    });

    return json(
      {
        error: message,
      },
      status,
    );
  }
}
