import { NextRequest, NextResponse } from "next/server";

/**
 * Temporary Shopify webhook endpoint.
 *
 * Current route:
 * /api/shopify
 *
 * This placeholder does not unlock NOVA access yet.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      message: "Dreamscape Shopify webhook endpoint is active.",
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const topic =
      request.headers.get("x-shopify-topic") ?? "unknown";

    const webhookId =
      request.headers.get("x-shopify-webhook-id") ?? "unknown";

    // Read the request so the route can accept Shopify webhook calls.
    // Do not process or trust the contents until HMAC verification is added.
    await request.text();

    console.log("Temporary Shopify webhook received:", {
      topic,
      webhookId,
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Webhook received. NOVA access processing has not been added yet.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Temporary Shopify webhook error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to receive the Shopify webhook.",
      },
      { status: 500 }
    );
  }
}