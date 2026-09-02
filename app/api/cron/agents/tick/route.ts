import {
  NextResponse,
} from "next/server";

import {
  runAgentOrchestratorTick,
} from "@/lib/agents/orchestrator/orchestrator";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  60;

function json(
  body: unknown,
  status = 200,
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function boundedInteger(
  raw: string | null,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed =
    Number(
      raw,
    );

  if (
    !Number.isFinite(
      parsed,
    )
  ) {
    return fallback;
  }

  return Math.max(
    minimum,
    Math.min(
      maximum,
      Math.floor(
        parsed,
      ),
    ),
  );
}

export async function GET(
  request: Request,
) {
  const secret =
    process.env.CRON_SECRET;

  if (!secret) {
    return json(
      {
        ok: false,
        error:
          "CRON_SECRET is not configured.",
      },
      503,
    );
  }

  const authorization =
    request.headers.get(
      "authorization",
    );

  if (
    authorization !==
    `Bearer ${secret}`
  ) {
    return json(
      {
        ok: false,
        error:
          "Unauthorized scheduler request.",
      },
      401,
    );
  }

  const url =
    new URL(
      request.url,
    );

  const shardCount =
    boundedInteger(
      url.searchParams.get(
        "shards",
      ),
      1,
      1,
      32,
    );

  const shardIndex =
    boundedInteger(
      url.searchParams.get(
        "shard",
      ),
      0,
      0,
      shardCount - 1,
    );

  const summary =
    await runAgentOrchestratorTick({
      triggerSource:
        "scheduler",
      maxDecisionsPerTick:
        2,
      shardIndex,
      shardCount,
    });

  return json(
    {
      ...summary,
      shardIndex,
      shardCount,
    },
    summary.ok
      ? 200
      : 500,
  );
}
