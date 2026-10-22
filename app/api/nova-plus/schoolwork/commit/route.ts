import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  isUuid,
  masteryRefreshStatus,
  publicSchoolworkError,
  validateCommitDecisions,
} from "@/lib/nova-plus/schoolwork-guards";

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

/** Uploads whose review may be (re)committed: fresh reviews and "Edit Analysis". */
const COMMITTABLE_STATUSES = ["review_ready", "approved"];

function errorJson(code: string, status: number) {
  return json({ error_code: code, error: publicSchoolworkError(code) }, status);
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
          analysis_revision?: unknown;
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

    const decisions: ReviewDecision[] = body.decisions.map((decision) => ({
      ...decision,
      item_index: Number(decision.item_index),
      skill_code: decision.skill_code.trim(),
    }));

    if (!isUuid(uploadId)) {
      return errorJson("UPLOAD_NOT_FOUND", 404);
    }

    // Only the owner column is read before the caller is authorised.
    const { data: ownerRow, error: ownerError } =
      await supabaseAdmin
        .from("nova_schoolwork_uploads")
        .select("id,student_user_id")
        .eq("id", uploadId)
        .maybeSingle();

    if (ownerError) throw ownerError;

    const studentUserId = String(ownerRow?.student_user_id || "");

    // Same viewer rule as the RLS policies, evaluated as the caller. Missing
    // and unauthorised uploads get the same response (no existence probe),
    // and nothing else is read or called for an unauthorised caller.
    let canView = false;

    if (ownerRow && studentUserId) {
      const viewer = client as unknown as {
        rpc: (
          name: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: unknown; error: unknown }>;
      };

      const { data: viewData, error: viewError } = await viewer.rpc(
        "nova_plus_can_view_student",
        {
          p_student_user_id: studentUserId,
        },
      );

      canView = !viewError && viewData === true;
    }

    if (!canView) {
      return errorJson("UPLOAD_NOT_FOUND", 404);
    }

    const { data: uploadRow, error: uploadError } =
      await supabaseAdmin
        .from("nova_schoolwork_uploads")
        .select(
          "id,student_user_id,status,detected_subject,detected_primary_level,analysis_revision",
        )
        .eq("id", uploadId)
        .eq("student_user_id", studentUserId)
        .maybeSingle();

    if (uploadError) throw uploadError;

    if (!uploadRow) {
      return errorJson("UPLOAD_NOT_FOUND", 404);
    }

    if (!COMMITTABLE_STATUSES.includes(String(uploadRow.status))) {
      return errorJson("COMMIT_REJECTED", 409);
    }

    // Decisions made against an older analysis are never applied to the
    // items of a newer one. Older clients that omit the revision skip this.
    if (
      body.analysis_revision !== undefined &&
      body.analysis_revision !== null &&
      Number(body.analysis_revision) !==
        Number(uploadRow.analysis_revision || 0)
    ) {
      return errorJson("ANALYSIS_SUPERSEDED", 409);
    }

    // Exactly one valid decision for every stored item of this analysis.
    const { data: itemRows, error: itemError } = await supabaseAdmin
      .from("nova_schoolwork_items")
      .select("id,item_index,final_correctness")
      .eq("upload_id", uploadId);

    if (itemError) throw itemError;

    const storedItems = (itemRows ?? []) as Array<{
      id: unknown;
      item_index: unknown;
      final_correctness: unknown;
    }>;

    const storedIndexes = storedItems.map((row) => Number(row.item_index));

    if (!storedIndexes.length) {
      return errorJson("COMMIT_REJECTED", 409);
    }

    // The items must come from a completed analysis: the latest run must
    // have succeeded and recorded exactly these items (refuses failed,
    // partial, superseded or archive-restored analyses). Every route version
    // that marks a run succeeded also records question_count, so a tracked
    // success without a count is refused too (fail closed). Uploads analysed
    // before run tracking (no run rows) are unaffected.
    const { data: latestRun, error: runError } = await supabaseAdmin
      .from("nova_schoolwork_analysis_runs")
      .select("status,question_count")
      .eq("upload_id", uploadId)
      .order("run_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (runError) throw runError;

    if (
      latestRun &&
      (
        latestRun.status !== "succeeded" ||
        latestRun.question_count === null ||
        latestRun.question_count === undefined ||
        Number(latestRun.question_count) !== storedIndexes.length
      )
    ) {
      return errorJson("ANALYSIS_NOT_COMMITTABLE", 409);
    }

    const decisionCheck = validateCommitDecisions(decisions, storedIndexes);

    if (!decisionCheck.ok) {
      return errorJson(decisionCheck.code, 400);
    }

    // Included concepts must belong to the canonical, approved taxonomy for
    // this upload's subject and level (never a code from another subject).
    const includedSkillCodes = [
      ...new Set(
        decisions
          .filter((decision) => decision.decision === "include")
          .map((decision) => decision.skill_code),
      ),
    ];

    let includedSkillIds: string[] = [];

    if (includedSkillCodes.length) {
      const { data: taxonomyRows, error: taxonomyError } = await supabaseAdmin
        .from("learning_skill_taxonomy")
        .select("id,skill_code,domain,topic")
        .eq("subject", uploadRow.detected_subject)
        .eq("primary_level", uploadRow.detected_primary_level)
        .eq("source", "nova_curriculum_rollout_sql")
        .eq("is_topic_level", false)
        .eq("is_active", true)
        .eq("review_status", "approved")
        .in("skill_code", includedSkillCodes);

      if (taxonomyError) throw taxonomyError;

      // Same English listening / viewing exclusion as the commit RPC.
      const allowedRows = (taxonomyRows ?? []).filter((row) => {
        if (uploadRow.detected_subject !== "english") return true;
        const domain = String(row.domain || "").toLowerCase();
        const topic = String(row.topic || "").toLowerCase();
        return (
          domain !== "listening" &&
          domain !== "viewing" &&
          !topic.includes("listening") &&
          !topic.includes("viewing")
        );
      });

      const validCodes = new Set(
        allowedRows.map((row) => String(row.skill_code)),
      );

      if (!includedSkillCodes.every((code) => validCodes.has(code))) {
        return errorJson("DECISION_SKILL_INVALID", 400);
      }

      includedSkillIds = allowedRows.map((row) => String(row.id));
    }

    // Edit flags change the committed confidence and evidence weight in the
    // commit RPC, so they are derived here from the stored values instead of
    // trusting the client: "edited" means the reviewer actually changed the
    // stored correctness or primary concept.
    const itemIds = storedItems.map((row) => String(row.id));

    const { data: primaryRows, error: primaryError } = await supabaseAdmin
      .from("nova_schoolwork_item_skills")
      .select("item_id,skill_id,approved")
      .in("item_id", itemIds)
      .eq("is_primary_skill", true);

    if (primaryError) throw primaryError;

    const primarySkillIds = [
      ...new Set(
        ((primaryRows ?? []) as Array<{ skill_id: unknown }>).map((row) =>
          String(row.skill_id),
        ),
      ),
    ];

    let codeBySkillId = new Map<string, string>();

    if (primarySkillIds.length) {
      const { data: primaryTaxonomy, error: primaryTaxonomyError } =
        await supabaseAdmin
          .from("learning_skill_taxonomy")
          .select("id,skill_code")
          .in("id", primarySkillIds);

      if (primaryTaxonomyError) throw primaryTaxonomyError;

      codeBySkillId = new Map(
        ((primaryTaxonomy ?? []) as Array<{ id: unknown; skill_code: unknown }>)
          .map((row) => [String(row.id), String(row.skill_code)]),
      );
    }

    // Approved primary (a saved review) wins over the AI-proposed primary.
    const primaryCodeByItem = new Map<string, string>();

    for (const row of [...((primaryRows ?? []) as Array<{
      item_id: unknown;
      skill_id: unknown;
      approved: unknown;
    }>)].sort((a, b) => Number(Boolean(a.approved)) - Number(Boolean(b.approved)))) {
      primaryCodeByItem.set(
        String(row.item_id),
        codeBySkillId.get(String(row.skill_id)) ?? "",
      );
    }

    const storedByIndex = new Map(
      storedItems.map((row) => [Number(row.item_index), row]),
    );

    const serverDecisions = decisions.map((decision) => {
      const stored = storedByIndex.get(decision.item_index);
      const storedCode = primaryCodeByItem.get(String(stored?.id)) ?? "";

      return {
        ...decision,
        mapping_edited:
          decision.decision === "include" &&
          decision.skill_code !== storedCode,
        correctness_edited:
          decision.decision === "include" &&
          decision.correctness !== String(stored?.final_correctness ?? ""),
      };
    });

    const priorityBefore = await recommendationTop(
      client as any,
      uploadRow.student_user_id,
    );

    const { data, error } = await (client as any).rpc(
      "commit_nova_schoolwork_review",
      {
        p_upload_id: uploadId,
        p_decisions: serverDecisions,
      },
    );

    if (error) {
      // Raw database text stays in server logs only.
      console.error("NOVA+ schoolwork commit failed", error);
      return errorJson("COMMIT_REJECTED", 400);
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
          "The reviewed evidence was saved, but the mastery recalculation is still pending.";

        console.error(
          "NOVA+ targeted schoolwork mastery refresh failed",
          masteryRefreshError,
        );
      } else {
        masteryRefreshed = true;
      }
    }

    let strengthsReinforced = 0;
    let conceptsNeedingMoreEvidence = 0;

    {
      const skillIds = includedSkillIds;

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
        mastery_refresh_status: masteryRefreshStatus({
          affectedSkillCount: affectedSkillIds.length,
          refreshed: masteryRefreshed,
        }),
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

    return errorJson("COMMIT_FAILED", 500);
  }
}
