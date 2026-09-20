import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type ReviewDecision = {
  item_index: number;
  decision: "include" | "exclude";
  skill_code: string;
  correctness: "correct" | "incorrect" | "partial" | "uncertain";
  mapping_edited: boolean;
  correctness_edited: boolean;
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

async function authenticatedClient(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) {
    throw new Error("AUTH_REQUIRED");
  }

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

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

  return {
    client,
    user,
  };
}

function isDecision(value: unknown): value is ReviewDecision {
  if (!value || typeof value !== "object") return false;

  const row = value as Record<string, unknown>;

  return (
    Number.isInteger(Number(row.item_index)) &&
    ["include", "exclude"].includes(String(row.decision)) &&
    ["correct", "incorrect", "partial", "uncertain"].includes(
      String(row.correctness),
    ) &&
    typeof row.skill_code === "string" &&
    typeof row.mapping_edited === "boolean" &&
    typeof row.correctness_edited === "boolean"
  );
}

export async function POST(request: Request) {
  try {
    const { client } = await authenticatedClient(request);

    const body = (await request.json().catch(() => null)) as
      | {
          upload_id?: unknown;
          decisions?: unknown;
        }
      | null;

    const uploadId = String(body?.upload_id ?? "").trim();

    if (!uploadId) {
      return json({ error: "upload_id is required." }, 400);
    }

    if (!Array.isArray(body?.decisions) || !body.decisions.every(isDecision)) {
      return json(
        {
          error:
            "A valid include/exclude decision is required for every schoolwork item.",
        },
        400,
      );
    }

    const { data, error } = await client.rpc(
      "commit_nova_schoolwork_review",
      {
        p_upload_id: uploadId,
        p_decisions: body.decisions,
      },
    );

    if (error) {
      console.error("NOVA+ schoolwork commit failed", error);
      return json(
        {
          error: error.message,
        },
        400,
      );
    }

    return json({
      status: "approved",
      result: data,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    if (message === "AUTH_REQUIRED") {
      return json({ error: "Please sign in again." }, 401);
    }

    console.error("NOVA+ schoolwork commit route failed", error);

    return json(
      {
        error: message,
      },
      500,
    );
  }
}
