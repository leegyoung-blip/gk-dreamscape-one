import crypto from "node:crypto";
import QRCode from "qrcode";

export type HitPayEnvironment = "sandbox" | "production";

export type HitPayPaymentRequestResponse = {
  id: string;
  amount: string;
  currency: string;
  status: string;
  reference_number: string | null;
  payment_methods: string[];
  url: string | null;
  created_at: string;
  updated_at: string;
  qr_code_data?: {
    qr_code?: string | null;
    qr_code_expiry?: string | null;
  } | null;
  [key: string]: unknown;
};

function normaliseEnvironment(value: string | undefined): HitPayEnvironment {
  return value?.trim().toLowerCase() === "production"
    ? "production"
    : "sandbox";
}

export function getHitPayEnvironment(): HitPayEnvironment {
  return normaliseEnvironment(process.env.HITPAY_ENVIRONMENT);
}

export function getHitPayApiConfig(environment = getHitPayEnvironment()) {
  const apiKey =
    environment === "production"
      ? process.env.HITPAY_PRODUCTION_API_KEY || process.env.HITPAY_API_KEY
      : process.env.HITPAY_SANDBOX_API_KEY || process.env.HITPAY_API_KEY;

  if (!apiKey) {
    throw new Error(
      `Missing HitPay ${environment} API key. Add the appropriate server-only Vercel environment variable.`,
    );
  }

  return {
    environment,
    apiKey,
    baseUrl:
      environment === "production"
        ? "https://api.hit-pay.com"
        : "https://api.sandbox.hit-pay.com",
  } as const;
}

export function getHitPayWebhookSalt(environment: HitPayEnvironment) {
  const salt =
    environment === "production"
      ? process.env.HITPAY_PRODUCTION_WEBHOOK_SALT ||
        process.env.HITPAY_WEBHOOK_SALT
      : process.env.HITPAY_SANDBOX_WEBHOOK_SALT ||
        process.env.HITPAY_WEBHOOK_SALT;

  if (!salt) {
    throw new Error(
      `Missing HitPay ${environment} webhook salt. Copy the per-webhook salt from the HitPay webhook endpoint settings into Vercel.`,
    );
  }

  return salt;
}

export async function createHitPayPayNowRequest(input: {
  amount: number;
  currency: string;
  invoiceNumber: string;
  invoiceId: string;
  accountId: string;
  payerName: string;
  email: string;
  phone?: string | null;
}) {
  const config = getHitPayApiConfig();

  const response = await fetch(`${config.baseUrl}/v1/payment-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-BUSINESS-API-KEY": config.apiKey,
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify({
      amount: input.amount.toFixed(2),
      currency: input.currency.toLowerCase(),
      payment_methods: ["paynow_online"],
      generate_qr: true,
      name: input.payerName,
      email: input.email,
      phone: input.phone || undefined,
      purpose: `Guru Kids Pro invoice ${input.invoiceNumber}`,
      reference_number: input.invoiceNumber,
      metadata: {
        invoice_id: input.invoiceId,
        account_id: input.accountId,
        invoice_number: input.invoiceNumber,
      },
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | HitPayPaymentRequestResponse
    | Record<string, unknown>
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : `HitPay returned HTTP ${response.status}`;
    throw new Error(message);
  }

  const request = payload as HitPayPaymentRequestResponse;
  const qrPayload = request.qr_code_data?.qr_code;

  if (!request.id || !qrPayload) {
    throw new Error(
      "HitPay created a payment request but did not return PayNow QR data.",
    );
  }

  return {
    environment: config.environment,
    request,
    qrPayload,
  };
}


export async function getHitPayPaymentRequest(
  environment: HitPayEnvironment,
  requestId: string,
) {
  const config = getHitPayApiConfig(environment);

  const response = await fetch(
    `${config.baseUrl}/v1/payment-requests/${encodeURIComponent(requestId)}`,
    {
      method: "GET",
      headers: {
        "X-BUSINESS-API-KEY": config.apiKey,
      },
      cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | HitPayPaymentRequestResponse
    | Record<string, unknown>
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : `HitPay returned HTTP ${response.status}`;

    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return payload as HitPayPaymentRequestResponse;
}

export async function deleteHitPayPaymentRequest(
  environment: HitPayEnvironment,
  requestId: string,
) {
  const config = getHitPayApiConfig(environment);

  const response = await fetch(
    `${config.baseUrl}/v1/payment-requests/${encodeURIComponent(requestId)}`,
    {
      method: "DELETE",
      headers: {
        "X-BUSINESS-API-KEY": config.apiKey,
      },
      cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : `HitPay returned HTTP ${response.status}`;

    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return payload || { success: true };
}


export type HitPaySubscriptionPlanResponse = {
  id: string;
  name?: string;
  description?: string | null;
  cycle?: string;
  currency?: string;
  amount?: number | string;
  reference?: string | null;
  [key: string]: unknown;
};

export type HitPayRecurringBillingResponse = {
  id: string;
  url?: string | null;
  status?: string | null;
  reference?: string | null;
  customer_id?: string | null;
  customer_email?: string | null;
  start_date?: string | null;
  [key: string]: unknown;
};

async function hitPayJsonRequest<T>(
  path: string,
  init: RequestInit,
  environment = getHitPayEnvironment(),
): Promise<T> {
  const config = getHitPayApiConfig(environment);

  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-BUSINESS-API-KEY": config.apiKey,
      "X-Requested-With": "XMLHttpRequest",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | T
    | Record<string, unknown>
    | null;

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "message" in payload
        ? String(payload.message)
        : `HitPay returned HTTP ${response.status}`;

    throw new Error(message);
  }

  return (payload || {}) as T;
}

export async function createHitPaySubscriptionPlan(input: {
  name: string;
  description: string;
  amount: number;
  currency: string;
  cycle: "monthly" | "yearly";
  reference: string;
  environment?: HitPayEnvironment;
}) {
  return hitPayJsonRequest<HitPaySubscriptionPlanResponse>(
    "/v1/subscription-plan",
    {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        description: input.description,
        amount: Number(input.amount.toFixed(2)),
        currency: input.currency.toUpperCase(),
        cycle: input.cycle,
        reference: input.reference,
        // 100 is HitPay's documented API maximum and keeps the
        // subscription long-running while still allowing cancellation.
        times_to_be_charged: 100,
      }),
    },
    input.environment,
  );
}

export async function createHitPayRecurringBilling(input: {
  planId: string;
  customerEmail: string;
  customerName: string;
  startDate: string;
  redirectUrl: string;
  reference: string;
  sendEmail: boolean;
  environment?: HitPayEnvironment;
}) {
  return hitPayJsonRequest<HitPayRecurringBillingResponse>(
    "/v1/recurring-billing",
    {
      method: "POST",
      body: JSON.stringify({
        plan_id: input.planId,
        customer_email: input.customerEmail,
        customer_name: input.customerName,
        start_date: input.startDate,
        redirect_url: input.redirectUrl,
        reference: input.reference,
        payment_methods: ["card"],
        send_email: input.sendEmail ? "true" : "false",
        times_to_be_charged: 100,
      }),
    },
    input.environment,
  );
}

export async function getHitPayRecurringBilling(
  environment: HitPayEnvironment,
  recurringBillingId: string,
) {
  return hitPayJsonRequest<HitPayRecurringBillingResponse>(
    `/v1/recurring-billing/${encodeURIComponent(recurringBillingId)}`,
    { method: "GET" },
    environment,
  );
}

export async function cancelHitPayRecurringBilling(
  environment: HitPayEnvironment,
  recurringBillingId: string,
) {
  return hitPayJsonRequest<Record<string, unknown>>(
    `/v1/recurring-billing/${encodeURIComponent(recurringBillingId)}`,
    { method: "DELETE" },
    environment,
  );
}

export async function hitPayQrDataUrl(qrPayload: string) {
  return QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 420,
    type: "image/png",
  });
}

export function validateHitPayWebhookSignature(input: {
  rawBody: string;
  signature: string;
  salt: string;
}) {
  const computed = crypto
    .createHmac("sha256", input.salt)
    .update(input.rawBody)
    .digest("hex");

  const suppliedBuffer = Buffer.from(input.signature.trim().toLowerCase());
  const computedBuffer = Buffer.from(computed);

  if (suppliedBuffer.length !== computedBuffer.length) return false;
  return crypto.timingSafeEqual(suppliedBuffer, computedBuffer);
}

export function isHitPayEnvironment(value: string): value is HitPayEnvironment {
  return value === "sandbox" || value === "production";
}
