import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

async function recommendationTop(
  client: any,
  studentId: string,
) {
  try {
    const { data, error } = await client.rpc(
      "get_nova_plus_recommendations",
      {
        p_student_user_id: studentId,
      },
    );

    if (error) return null;

    return data?.recommendations?.[0]?.skill_id ?? null;
  } catch {
    return null;
  }
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

    const { data: uploadRow, error: uploadError } =
      await supabaseAdmin
        .from("nova_schoolwork_uploads")
        .select("student_user_id")
        .eq("id", uploadId)
        .maybeSingle();

    if (uploadError || !uploadRow) {
      return json({ error: "Schoolwork upload not found." }, 404);
    }

    const priorityBefore = await recommendationTop(
      client as any,
      uploadRow.student_user_id,
    );

    const { data, error } = await (client as any).rpc(
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

    /*
     * The evidence transaction has COMMITTED at this point.
     *
     * Mastery is deliberately refreshed in a separate RPC so a slow mastery
     * calculation can never roll back the reviewed schoolwork evidence.
     */
    const affectedSkillIds = Array.isArray(
      data?.affected_skill_ids,
    )
      ? data.affected_skill_ids
          .map((value: unknown) => String(value || "").trim())
          .filter(Boolean)
      : [];

    let masteryRefreshed = false;
    let masteryRefreshWarning: string | null = null;

    if (affectedSkillIds.length > 0) {
      const {
        error: masteryRefreshError,
      } = await (client as any).rpc(
        "refresh_learner_skill_mastery_for_skills",
        {
          p_student_user_id:
            uploadRow.student_user_id,
          p_skill_ids:
            affectedSkillIds,
        },
      );

      if (masteryRefreshError) {
        masteryRefreshWarning =
          "The schoolwork was added successfully, but the immediate mastery refresh did not finish. NOVA+ will recalculate it on the next profile refresh.";

        console.error(
          "NOVA+ targeted schoolwork mastery refresh failed",
          masteryRefreshError,
        );
      } else {
        masteryRefreshed = true;
      }
    }

    const includedSkillCodes = [
      ...new Set(
        body.decisions
          .filter(
            (decision) =>
              decision.decision === "include",
          )
          .map((decision) => decision.skill_code)
          .filter(Boolean),
      ),
    ];

    let strengthsReinforced = 0;
    let conceptsNeedingMoreEvidence = 0;

    if (includedSkillCodes.length) {
      const { data: taxonomyRows } = await supabaseAdmin
        .from("learning_skill_taxonomy")
        .select("id,skill_code")
        .in("skill_code", includedSkillCodes);

      const skillIds =
        (taxonomyRows ?? []).map((row) => row.id);

      if (skillIds.length) {
        const { data: masteryRows } = await supabaseAdmin
          .from("learner_skill_mastery")
          .select(
            "skill_id,status,confidence_score,questions_attempted",
          )
          .eq(
            "student_user_id",
            uploadRow.student_user_id,
          )
          .in("skill_id", skillIds);

        for (const row of masteryRows ?? []) {
          if (
            ["secure", "mastered"].includes(
              String(row.status),
            )
          ) {
            strengthsReinforced += 1;
          } else if (
            [
              "developing",
              "emerging",
              "not_enough_data",
            ].includes(String(row.status)) ||
            Number(row.confidence_score || 0) < 55
          ) {
            conceptsNeedingMoreEvidence += 1;
          }
        }
      }
    }

    const priorityAfter = await recommendationTop(
      client as any,
      uploadRow.student_user_id,
    );

    return json({
      status: "approved",
      result: {
        ...data,
        mastery_refreshed:
          masteryRefreshed,
        mastery_refresh_warning:
          masteryRefreshWarning,
      },
      impact: {
        questions_added: Number(
          data?.items_included || 0,
        ),
        questions_excluded: Number(
          data?.items_excluded || 0,
        ),
        concepts_updated: includedSkillCodes.length,
        strengths_reinforced: strengthsReinforced,
        concepts_needing_more_evidence:
          conceptsNeedingMoreEvidence,
        priority_changed:
          Boolean(priorityBefore || priorityAfter) &&
          priorityBefore !== priorityAfter,
      },
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
