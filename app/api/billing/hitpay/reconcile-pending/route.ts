import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  reconcileGkpHitPayPayment,
  type GkpHitPayReconciliationResult,
} from "@/lib/gkp-hitpay-reconciliation";
import {
  isHitPayEnvironment,
  type HitPayEnvironment,
} from "@/lib/hitpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(
  body: unknown,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function readableError(
  error: unknown,
) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object"
  ) {
    const value = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };

    const parts = [
      typeof value.message === "string"
        ? value.message
        : "",
      typeof value.details === "string" &&
      value.details
        ? `Details: ${value.details}`
        : "",
      typeof value.hint === "string" &&
      value.hint
        ? `Hint: ${value.hint}`
        : "",
      typeof value.code === "string" &&
      value.code
        ? `Code: ${value.code}`
        : "",
    ].filter(Boolean);

    if (parts.length) {
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

async function requireBillingStaff(
  request: Request,
) {
  const authHeader =
    request.headers.get(
      "authorization",
    ) || "";

  const token =
    authHeader.startsWith(
      "Bearer ",
    )
      ? authHeader
          .slice(7)
          .trim()
      : "";

  if (!token) {
    throw new Error(
      "AUTH_REQUIRED",
    );
  }

  const url =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const key =
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env
      .SUPABASE_ANON_KEY ||
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env
      .SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_AUTH_CONFIG_MISSING",
    );
  }

  const client =
    createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      },
    });

  const {
    data: { user },
    error: userError,
  } =
    await client.auth.getUser(
      token,
    );

  if (
    userError ||
    !user
  ) {
    throw new Error(
      "AUTH_REQUIRED",
    );
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
    throw new Error(
      "ACCESS_DENIED",
    );
  }

  return user;
}

type CandidateRow = {
  id: string;
  invoice_id: string;
  environment: string;
  provider_request_id: string;
  provider_status: string;
  is_current: boolean;
  created_at: string;
};

type BatchResult = {
  paymentRequestId: string;
  invoiceId: string;
  result:
    | GkpHitPayReconciliationResult
    | null;
  error: string | null;
};

function normaliseLimit(
  value: unknown,
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 25;
  }

  return Math.min(
    Math.max(
      Math.trunc(parsed),
      1,
    ),
    50,
  );
}

export async function POST(
  request: Request,
) {
  try {
    const staff =
      await requireBillingStaff(
        request,
      );

    const body =
      (await request.json().catch(
        () => ({}),
      )) as {
        limit?: number;
        paymentRequestIds?: string[];
      };

    const requestedIds =
      Array.isArray(
        body.paymentRequestIds,
      )
        ? Array.from(
            new Set(
              body.paymentRequestIds
                .map((value) =>
                  String(
                    value || "",
                  ).trim(),
                )
                .filter(Boolean),
            ),
          ).slice(0, 50)
        : [];

    const limit =
      normaliseLimit(
        body.limit,
      );

    let query =
      supabaseAdmin
        .from(
          "gkp_billing_payment_requests",
        )
        .select(
          "id,invoice_id,environment,provider_request_id,provider_status,is_current,created_at",
        )
        .eq(
          "provider",
          "hitpay",
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        );

    if (
      requestedIds.length > 0
    ) {
      query = query.in(
        "provider_request_id",
        requestedIds,
      );
    } else {
      /*
       * This intentionally includes:
       *
       * - current PayNow requests; and
       * - requests whose local provider status already says
       *   completed but may still be missing the local payment.
       *
       * The reconciliation engine itself is idempotent, so
       * already-reconciled rows are safe to inspect again.
       */
      query = query
        .or(
          "is_current.eq.true,provider_status.eq.completed",
        )
        .limit(limit);
    }

    const {
      data: candidateData,
      error: candidateError,
    } = await query;

    if (candidateError) {
      throw candidateError;
    }

    const candidates =
      (candidateData ||
        []) as CandidateRow[];

    const results:
      BatchResult[] = [];

    for (
      const candidate of candidates
    ) {
      const environment =
        String(
          candidate.environment ||
            "",
        )
          .trim()
          .toLowerCase();

      if (
        !isHitPayEnvironment(
          environment,
        )
      ) {
        results.push({
          paymentRequestId:
            candidate.provider_request_id,
          invoiceId:
            candidate.invoice_id,
          result: null,
          error:
            `Invalid stored HitPay environment "${environment || "blank"}".`,
        });

        continue;
      }

      try {
        const result =
          await reconcileGkpHitPayPayment(
            {
              environment:
                environment as HitPayEnvironment,
              providerRequestId:
                candidate.provider_request_id,
              source:
                "admin_refresh",
              actorUserId:
                staff.id,
            },
          );

        results.push({
          paymentRequestId:
            candidate.provider_request_id,
          invoiceId:
            candidate.invoice_id,
          result,
          error: null,
        });
      } catch (error) {
        results.push({
          paymentRequestId:
            candidate.provider_request_id,
          invoiceId:
            candidate.invoice_id,
          result: null,
          error:
            readableError(
              error,
            ),
        });
      }
    }

    const reconciled =
      results.filter(
        (row) =>
          row.result?.status ===
          "reconciled",
      ).length;

    const alreadyReconciled =
      results.filter(
        (row) =>
          row.result?.status ===
          "already_reconciled",
      ).length;

    const pending =
      results.filter(
        (row) =>
          row.result?.status ===
          "provider_not_completed",
      ).length;

    const needsAttention =
      results.filter(
        (row) =>
          row.result?.status ===
            "needs_attention" ||
          Boolean(row.error),
      ).length;

    return json({
      ok: true,
      scanned:
        results.length,
      reconciled,
      alreadyReconciled,
      pending,
      needsAttention,
      results,
    });
  } catch (error) {
    const message =
      readableError(error);

    if (
      message ===
      "AUTH_REQUIRED"
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
      message ===
      "ACCESS_DENIED"
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
      "GKP HitPay batch reconciliation failed",
      {
        message,
        rawError: error,
      },
    );

    return json(
      {
        error: message,
      },
      500,
    );
  }
}
