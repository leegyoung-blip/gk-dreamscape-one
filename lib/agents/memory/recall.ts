import "server-only";

import {
  type AgentMemoryItem,
  type RecallAgentMemoryArgs,
  type RecalledAgentMemory,
} from "@/lib/agents/memory/types";

function asObject(
  value:
    unknown,
) {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value,
    )
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return {};
}

function normalizeTokens(
  value:
    string,
) {
  return [
    ...new Set(
      value
        .toLowerCase()
        .replace(
          /[^a-z0-9\s_-]/g,
          " ",
        )
        .split(
          /\s+/,
        )
        .map(
          (
            token,
          ) =>
            token.trim(),
        )
        .filter(
          (
            token,
          ) =>
            token.length >=
            2,
        ),
    ),
  ];
}

function calculateRecencyScore(
  occurredAt:
    string,
) {
  const timestamp =
    new Date(
      occurredAt,
    ).getTime();

  if (
    !Number.isFinite(
      timestamp,
    )
  ) {
    return 0;
  }

  const ageHours =
    Math.max(
      0,
      (
        Date.now() -
        timestamp
      ) /
      3_600_000,
    );

  /*
   * Falls gradually rather than becoming useless immediately.
   */
  return 1 /
    (
      1 +
      ageHours /
        168
    );
}

function convertRow(
  row:
    Record<
      string,
      unknown
    >,
): AgentMemoryItem {
  return {
    id:
      String(
        row.id,
      ),

    agentUserId:
      String(
        row.agent_user_id,
      ),

    memoryType:
      row.memory_type as AgentMemoryItem["memoryType"],

    domain:
      row.domain as AgentMemoryItem["domain"],

    subjectKey:
      row.subject_key
        ? String(
            row.subject_key,
          )
        : null,

    summary:
      String(
        row.summary ||
        "",
      ),

    content:
      asObject(
        row.content,
      ),

    importance:
      Number(
        row.importance ||
        0,
      ),

    confidence:
      Number(
        row.confidence ||
        0,
      ),

    valence:
      Number(
        row.valence ||
        0,
      ),

    sourceType:
      row.source_type as AgentMemoryItem["sourceType"],

    sourceSnapshotId:
      row.source_snapshot_id
        ? String(
            row.source_snapshot_id,
          )
        : null,

    sourceActionRequestId:
      row.source_action_request_id
        ? String(
            row.source_action_request_id,
          )
        : null,

    dedupeKey:
      row.dedupe_key
        ? String(
            row.dedupe_key,
          )
        : null,

    occurredAt:
      String(
        row.occurred_at,
      ),

    expiresAt:
      row.expires_at
        ? String(
            row.expires_at,
          )
        : null,

    recallCount:
      Number(
        row.recall_count ||
        0,
      ),

    lastRecalledAt:
      row.last_recalled_at
        ? String(
            row.last_recalled_at,
          )
        : null,
  };
}

export async function recallAgentMemory({
  admin,
  agentUserId,
  requestSource,
  createdBy = null,
  query = "",
  domain,
  memoryTypes,
  limit = 12,
  minimumImportance = 0,
}: RecallAgentMemoryArgs): Promise<
  RecalledAgentMemory[]
> {
  const cleanLimit =
    Math.min(
      30,
      Math.max(
        1,
        Math.floor(
          limit,
        ),
      ),
    );

  let request =
    admin
      .from(
        "agent_memory_items",
      )
      .select(
        `
        id,
        agent_user_id,
        memory_type,
        domain,
        subject_key,
        summary,
        content,
        importance,
        confidence,
        valence,
        source_type,
        source_snapshot_id,
        source_action_request_id,
        dedupe_key,
        occurred_at,
        expires_at,
        recall_count,
        last_recalled_at
      `,
      )
      .eq(
        "agent_user_id",
        agentUserId,
      )
      .eq(
        "status",
        "active",
      )
      .gte(
        "importance",
        Math.max(
          0,
          Math.min(
            1,
            minimumImportance,
          ),
        ),
      )
      .order(
        "importance",
        {
          ascending:
            false,
        },
      )
      .order(
        "occurred_at",
        {
          ascending:
            false,
        },
      )
      .limit(
        200,
      );

  if (domain) {
    request =
      request.eq(
        "domain",
        domain,
      );
  }

  if (
    memoryTypes &&
    memoryTypes.length >
      0
  ) {
    request =
      request.in(
        "memory_type",
        memoryTypes,
      );
  }

  const {
    data,
    error,
  } =
    await request;

  if (error) {
    throw new Error(
      `Agent memory could not be recalled: ${error.message}`,
    );
  }

  const now =
    Date.now();

  const queryTokens =
    normalizeTokens(
      query,
    );

  const candidates =
    (
      data ||
      []
    )
      .map(
        (
          rawRow,
        ) => {
          const memory =
            convertRow(
              rawRow as Record<
                string,
                unknown
              >,
            );

          if (
            memory.expiresAt &&
            new Date(
              memory.expiresAt,
            ).getTime() <=
              now
          ) {
            return null;
          }

          const reasons:
            string[] =
            [];

          const importanceScore =
            memory.importance;

          const confidenceScore =
            memory.confidence;

          const recencyScore =
            calculateRecencyScore(
              memory.occurredAt,
            );

          const searchableText =
            `${
              memory.summary
            } ${
              memory.subjectKey ||
              ""
            } ${
              JSON.stringify(
                memory.content,
              )
            }`.toLowerCase();

          let matchingTokens =
            0;

          for (
            const token
            of queryTokens
          ) {
            if (
              searchableText.includes(
                token,
              )
            ) {
              matchingTokens +=
                1;
            }
          }

          const queryScore =
            queryTokens.length >
            0
              ? matchingTokens /
                queryTokens.length
              : 0;

          if (
            memory.importance >=
            0.8
          ) {
            reasons.push(
              "high importance",
            );
          }

          if (
            recencyScore >=
            0.8
          ) {
            reasons.push(
              "recent",
            );
          }

          if (
            queryScore > 0
          ) {
            reasons.push(
              "query match",
            );
          }

          const score =
            importanceScore *
              0.45 +
            confidenceScore *
              0.2 +
            recencyScore *
              0.25 +
            queryScore *
              0.1;

          return {
            memory,

            score,

            reasons,
          };
        },
      )
      .filter(
        (
          value,
        ): value is RecalledAgentMemory =>
          value !==
          null,
      )
      .sort(
        (
          left,
          right,
        ) =>
          right.score -
          left.score,
      )
      .slice(
        0,
        cleanLimit,
      );

  const memoryIds =
    candidates.map(
      (
        candidate,
      ) =>
        candidate.memory.id,
    );

  if (
    memoryIds.length >
    0
  ) {
    /*
     * Recall statistics are diagnostic memory metadata only.
     * They do not mutate DREAMSCAPE gameplay.
     */
    await Promise.all(
      memoryIds.map(
        async (
          memoryId,
        ) => {
          const memory =
            candidates.find(
              (
                candidate,
              ) =>
                candidate
                  .memory
                  .id ===
                memoryId,
            )?.memory;

          if (!memory) {
            return;
          }

          const {
            error:
              updateError,
          } =
            await admin
              .from(
                "agent_memory_items",
              )
              .update({
                recall_count:
                  memory.recallCount +
                  1,

                last_recalled_at:
                  new Date()
                    .toISOString(),
              })
              .eq(
                "id",
                memoryId,
              )
              .eq(
                "agent_user_id",
                agentUserId,
              );

          if (
            updateError
          ) {
            console.error(
              "Agent memory recall counter update failed:",
              updateError.message,
            );
          }
        },
      ),
    );
  }

  const {
    error:
      recallAuditError,
  } =
    await admin
      .from(
        "agent_memory_recall_events",
      )
      .insert({
        agent_user_id:
          agentUserId,

        request_source:
          requestSource,

        query_label:
          query
            ? query.slice(
                0,
                200,
              )
            : null,

        domain_filter:
          domain ||
          null,

        memory_ids:
          memoryIds,

        result_count:
          memoryIds.length,

        metadata: {
          recall_version:
            "MemoryRecallV1",

          requested_limit:
            cleanLimit,

          requested_memory_types:
            memoryTypes ||
            [],
        },

        created_by:
          createdBy,
      });

  if (
    recallAuditError
  ) {
    console.error(
      "Agent memory recall audit failed:",
      recallAuditError.message,
    );
  }

  return candidates;
}