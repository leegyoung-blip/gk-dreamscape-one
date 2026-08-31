import {
  NextResponse,
} from "next/server";

import {
  checkAdminFromRequest,
} from "@/lib/checkAdmin";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  provisionAgent,
  validateAgentProvisioning,
  type AgentProvisionSpec,
} from "@/lib/agents/provision";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

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

export async function POST(
  request: Request,
) {
  const access =
    await checkAdminFromRequest(
      request,
    );

  if (
    !access.isAdmin ||
    !access.user
  ) {
    return json(
      {
        ok: false,
        error:
          access.error ||
          "Admin access required.",
      },
      403,
    );
  }

  try {
    const body =
      (await request.json()) as {
        action?:
          | "validate"
          | "provision";

        confirmation?: string;

        spec?:
          AgentProvisionSpec;
      };

    if (!body.spec) {
      return json(
        {
          ok: false,
          error:
            "Agent specification is required.",
        },
        400,
      );
    }

    const admin =
      createAdminClient();

    if (
      body.action ===
      "validate"
    ) {
      const cleanSpec =
        await validateAgentProvisioning({
          admin,
          spec:
            body.spec,
        });

      return json({
        ok: true,

        valid: true,

        agent: {
          agentCode:
            cleanSpec.agentCode,

          internalHandle:
            cleanSpec.internalHandle,

          email:
            cleanSpec.email,

          naturalName:
            cleanSpec.naturalName,

          username:
            cleanSpec.username,

          accountRole:
            cleanSpec.accountRole,

          worldAffinity:
            cleanSpec.worldAffinity,

          cohortKey:
            cleanSpec.cohortKey,

          policy:
            `${cleanSpec.policyKey}:v${cleanSpec.policyVersion}`,

          lifecycleStatus:
            "dormant",
        },
      });
    }

    if (
      body.action !==
      "provision"
    ) {
      return json(
        {
          ok: false,
          error:
            "Unsupported provisioning action.",
        },
        400,
      );
    }

    /*
     * Deliberate destructive-action safeguard.
     *
     * Phase 1D population generation must explicitly supply this.
     */
    if (
      body.confirmation !==
      "PROVISION_AGENT"
    ) {
      return json(
        {
          ok: false,
          error:
            'Provisioning requires confirmation "PROVISION_AGENT".',
        },
        400,
      );
    }

    const result =
      await provisionAgent({
        admin,

        initiatedBy:
          access.user.id,

        spec:
          body.spec,
      });

    if (!result.ok) {
      return json(
        result,
        result.status ===
          "cleanup_required"
          ? 500
          : 422,
      );
    }

    return json(
      result,
      201,
    );
  } catch (error) {
    console.error(
      "Agent provisioning route error:",
      error,
    );

    return json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Agent provisioning failed.",
      },
      500,
    );
  }
}