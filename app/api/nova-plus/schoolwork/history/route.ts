import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

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

  return { client, user };
}

async function canViewStudent(
  client: any,
  studentId: string,
) {
  /*
   * This route creates an authenticated Supabase client at runtime.
   * The project's generated Database types do not yet include all of the
   * NOVA+/Phase 4 RPC signatures, so using the generic ReturnType of
   * createClient incorrectly narrows rpc() to functions that accept no args.
   *
   * Keep this boundary intentionally runtime-typed. The database itself still
   * validates the RPC name and arguments.
   */
  const { data, error } = await client.rpc(
    "nova_plus_can_view_student",
    {
      p_student_user_id: studentId,
    },
  );

  return !error && Boolean(data);
}

async function getUpload(uploadId: string) {
  const { data, error } = await supabaseAdmin
    .from("nova_schoolwork_uploads")
    .select("*")
    .eq("id", uploadId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function GET(request: Request) {
  try {
    const { client } = await authenticatedClient(request);
    const url = new URL(request.url);

    const studentId = String(
      url.searchParams.get("student_id") || "",
    ).trim();

    const uploadId = String(
      url.searchParams.get("upload_id") || "",
    ).trim();

    const includeArchived =
      url.searchParams.get("include_archived") === "1";

    if (!studentId) {
      return json({ error: "student_id is required." }, 400);
    }

    if (!(await canViewStudent(client, studentId))) {
      return json(
        { error: "You do not have access to this learner." },
        403,
      );
    }

    if (uploadId) {
      const upload = await getUpload(uploadId);

      if (!upload || upload.student_user_id !== studentId) {
        return json({ error: "Schoolwork upload not found." }, 404);
      }

      const [
        analysisResult,
        itemsResult,
      ] = await Promise.all([
        supabaseAdmin
          .from("nova_schoolwork_analyses")
          .select("*")
          .eq("upload_id", uploadId)
          .maybeSingle(),

        supabaseAdmin
          .from("nova_schoolwork_items")
          .select("*")
          .eq("upload_id", uploadId)
          .order("item_index"),
      ]);

      if (analysisResult.error) throw analysisResult.error;
      if (itemsResult.error) throw itemsResult.error;

      const { data: runRows, error: runError } =
        await supabaseAdmin
          .from("nova_schoolwork_analysis_runs")
          .select(
            "id,run_number,trigger_source,status,stage,extraction_model,reasoning_model,extraction_response_id,reasoning_response_id,extraction_usage,reasoning_usage,extraction_cost_usd,reasoning_cost_usd,total_cost_usd,automatic_retry_count,page_count,question_count,duration_ms,error_code,error_message,started_at,completed_at",
          )
          .eq("upload_id", uploadId)
          .order("run_number", { ascending: false });

      if (runError) throw runError;

      const { data: signedPreview, error: previewError } =
        await supabaseAdmin.storage
          .from(upload.storage_bucket)
          .createSignedUrl(upload.storage_path, 10 * 60);

      const previewUrl =
        previewError || !signedPreview?.signedUrl
          ? null
          : signedPreview.signedUrl;

      const items = itemsResult.data ?? [];
      const itemIds = items.map((item) => item.id);

      let mappingRows: any[] = [];

      if (itemIds.length) {
        const { data, error } = await supabaseAdmin
          .from("nova_schoolwork_item_skills")
          .select(
            "id,item_id,skill_id,is_primary_skill,mapping_confidence,proposed_evidence_weight,mapping_reason,approved",
          )
          .in("item_id", itemIds);

        if (error) throw error;
        mappingRows = data ?? [];
      }

      const skillIds = [
        ...new Set(
          mappingRows
            .map((row) => String(row.skill_id || ""))
            .filter(Boolean),
        ),
      ];

      let taxonomyRows: any[] = [];

      if (skillIds.length) {
        const { data, error } = await supabaseAdmin
          .from("learning_skill_taxonomy")
          .select(
            "id,skill_code,skill_name,domain,topic,subject,primary_level,public_explanation",
          )
          .in("id", skillIds);

        if (error) throw error;
        taxonomyRows = data ?? [];
      }

      const taxonomyById = Object.fromEntries(
        taxonomyRows.map((row) => [String(row.id), row]),
      );

      const mappingsByItem = new Map<string, any[]>();

      for (const mapping of mappingRows) {
        const itemId = String(mapping.item_id);
        const current = mappingsByItem.get(itemId) ?? [];
        current.push({
          ...mapping,
          skill: taxonomyById[String(mapping.skill_id)] ?? null,
        });
        mappingsByItem.set(itemId, current);
      }

      const detailItems = items.map((item) => {
        const mappings = mappingsByItem.get(String(item.id)) ?? [];
        const primary =
          mappings.find(
            (mapping) =>
              mapping.is_primary_skill && mapping.approved,
          ) ??
          mappings.find((mapping) => mapping.is_primary_skill) ??
          null;

        return {
          ...item,
          mappings,
          primary_skill: primary?.skill ?? null,
        };
      });

      /*
       * Shape compatible with NovaSchoolworkUploader's AnalysisResult so
       * review_ready uploads can be reopened without re-running the LLMs.
       */
      const skillDisplay = Object.fromEntries(
        taxonomyRows.map((skill) => [
          skill.skill_code,
          {
            skill_id: skill.id,
            skill_code: skill.skill_code,
            skill_name: skill.skill_name,
            domain: skill.domain,
            topic: skill.topic,
          },
        ]),
      );

      return json({
        upload,
        analysis: analysisResult.data,
        analysis_runs: runRows ?? [],
        preview_url: previewUrl,
        detail_items: detailItems,
        analysis_result: {
          status: "review_ready",
          upload: {
            id: upload.id,
            student_user_id: upload.student_user_id,
            assignment_title: upload.assignment_title || "",
            subject: upload.detected_subject,
            primary_level: upload.detected_primary_level,
            page_count: upload.page_count || 1,
            teacher_marked: Boolean(upload.teacher_marked),
            document_quality: upload.document_quality || "medium",
            analysis_confidence: Number(upload.analysis_confidence || 0),
          },
          analysis: {
            overall_summary:
              analysisResult.data?.overall_summary || "",
            strength_skill_codes:
              analysisResult.data?.strength_skill_codes || [],
            support_skill_codes:
              analysisResult.data?.support_skill_codes || [],
            extraction_model:
              analysisResult.data?.extraction_model || "",
            reasoning_model:
              analysisResult.data?.reasoning_model || "",
          },
          skills: skillDisplay,
          items: detailItems.map((item) => ({
            item_index: item.item_index,
            page_number: item.page_number || 0,
            question_number: item.question_number || "",
            prompt: item.prompt || "",
            student_answer: item.student_answer || "",
            expected_answer: item.expected_answer || "",
            teacher_mark: item.teacher_mark,
            teacher_feedback: item.teacher_feedback || "",
            final_correctness: item.final_correctness,
            correctness_source: item.correctness_source,
            extraction_confidence: Number(
              item.extraction_confidence || 0,
            ),
            correctness_confidence: Number(
              item.correctness_confidence || 0,
            ),
            mapping_confidence: Number(
              item.mapping_confidence || 0,
            ),
            reasoning_note: item.reasoning_note || "",
            needs_review: Boolean(item.needs_review),
            evidence_recommendation: item.included_in_profile
              ? "include"
              : item.evidence_recommendation,
            proposed_evidence_weight: Number(
              item.proposed_evidence_weight || 0,
            ),
            primary_skill: item.primary_skill
              ? {
                  skill_id: item.primary_skill.id,
                  skill_code: item.primary_skill.skill_code,
                  skill_name: item.primary_skill.skill_name,
                  domain: item.primary_skill.domain,
                  topic: item.primary_skill.topic,
                }
              : null,
            supporting_skills: item.mappings
              .filter(
                (mapping: any) =>
                  !mapping.is_primary_skill && mapping.skill,
              )
              .map((mapping: any) => ({
                skill_id: mapping.skill.id,
                skill_code: mapping.skill.skill_code,
                skill_name: mapping.skill.skill_name,
                domain: mapping.skill.domain,
                topic: mapping.skill.topic,
              })),
          })),
        },
      });
    }

    let query = supabaseAdmin
      .from("nova_schoolwork_uploads")
      .select(
        "id,student_user_id,original_filename,mime_type,file_size_bytes,file_sha256,analysis_revision,assignment_title,detected_subject,detected_primary_level,page_count,teacher_marked,document_quality,analysis_confidence,status,error_message,analysis_started_at,analysis_completed_at,reviewed_at,archived_at,created_at,updated_at",
      )
      .eq("student_user_id", studentId)
      .order("created_at", { ascending: false })
      .limit(60);

    if (!includeArchived) {
      query = query.neq("status", "archived");
    }

    const { data: uploads, error } = await query;
    if (error) throw error;

    const uploadIds = (uploads ?? []).map((upload) => upload.id);

    let items: any[] = [];

    if (uploadIds.length) {
      const { data, error: itemError } = await supabaseAdmin
        .from("nova_schoolwork_items")
        .select(
          "upload_id,final_correctness,included_in_profile,needs_review",
        )
        .in("upload_id", uploadIds);

      if (itemError) throw itemError;
      items = data ?? [];
    }

    const statsByUpload = new Map<
      string,
      {
        items: number;
        included: number;
        needs_review: number;
      }
    >();

    for (const item of items) {
      const uploadId = String(item.upload_id);
      const stats =
        statsByUpload.get(uploadId) ?? {
          items: 0,
          included: 0,
          needs_review: 0,
        };

      stats.items += 1;
      if (item.included_in_profile) stats.included += 1;
      if (item.needs_review) stats.needs_review += 1;

      statsByUpload.set(uploadId, stats);
    }

    return json({
      uploads: (uploads ?? []).map((upload) => ({
        ...upload,
        stats:
          statsByUpload.get(String(upload.id)) ?? {
            items: 0,
            included: 0,
            needs_review: 0,
          },
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    if (message === "AUTH_REQUIRED") {
      return json({ error: "Please sign in again." }, 401);
    }

    console.error("NOVA+ schoolwork history GET failed", error);
    return json({ error: message }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const { client } = await authenticatedClient(request);

    const body = (await request.json().catch(() => null)) as
      | {
          action?: unknown;
          upload_id?: unknown;
        }
      | null;

    const action = String(body?.action || "").trim();
    const uploadId = String(body?.upload_id || "").trim();

    if (!uploadId) {
      return json({ error: "upload_id is required." }, 400);
    }

    const upload = await getUpload(uploadId);

    if (!upload) {
      return json({ error: "Schoolwork upload not found." }, 404);
    }

    if (!(await canViewStudent(client, upload.student_user_id))) {
      return json(
        { error: "You do not have access to this learner." },
        403,
      );
    }

    if (action === "archive" || action === "restore") {
      const { data, error } = await (client as any).rpc(
        "set_nova_schoolwork_archived",
        {
          p_upload_id: uploadId,
          p_archived: action === "archive",
        },
      );

      if (error) {
        return json({ error: error.message }, 400);
      }

      return json({
        status: action === "archive" ? "archived" : "restored",
        result: data,
      });
    }

    if (action === "delete") {
      /*
       * The RPC deletes DB rows + profile evidence and recalculates mastery.
       * We already captured the private storage location above.
       */
      const { data, error } = await (client as any).rpc(
        "delete_nova_schoolwork_upload",
        {
          p_upload_id: uploadId,
        },
      );

      if (error) {
        return json({ error: error.message }, 400);
      }

      try {
        await supabaseAdmin.storage
          .from(upload.storage_bucket)
          .remove([upload.storage_path]);
      } catch (storageError) {
        console.error(
          "Schoolwork DB delete succeeded but storage cleanup failed",
          storageError,
        );
      }

      return json({
        status: "deleted",
        result: data,
      });
    }

    return json(
      { error: "Unsupported schoolwork management action." },
      400,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    if (message === "AUTH_REQUIRED") {
      return json({ error: "Please sign in again." }, 401);
    }

    console.error("NOVA+ schoolwork history POST failed", error);
    return json({ error: message }, 500);
  }
}
