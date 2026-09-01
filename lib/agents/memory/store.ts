import "server-only";

import {
  createHash,
} from "crypto";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  AGENT_MEMORY_CHECKPOINT_VERSION,
  type StoreAgentMemoryArgs,
} from "@/lib/agents/memory/types";

function sortStable(
  value:
    unknown,
): unknown {
  if (
    Array.isArray(
      value,
    )
  ) {
    return value.map(
      sortStable,
    );
  }

  if (
    value &&
    typeof value ===
      "object"
  ) {
    const source =
      value as Record<
        string,
        unknown
      >;

    const result:
      Record<
        string,
        unknown
      > = {};

    for (
      const key
      of Object.keys(
        source,
      ).sort()
    ) {
      result[key] =
        sortStable(
          source[key],
        );
    }

    return result;
  }

  return value;
}

export function stableMemoryStringify(
  value:
    unknown,
) {
  return JSON.stringify(
    sortStable(
      value,
    ),
  );
}

export function hashMemoryState(
  value:
    unknown,
) {
  return createHash(
    "sha256",
  )
    .update(
      stableMemoryStringify(
        value,
      ),
      "utf8",
    )
    .digest(
      "hex",
    );
}

function clamp(
  value:
    number,

  minimum:
    number,

  maximum:
    number,
) {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value,
    ),
  );
}

export async function storeAgentMemory({
  admin,
  agentUserId,
  memoryType,
  domain,
  subjectKey = null,
  summary,
  content = {},
  importance = 0.5,
  confidence = 1,
  valence = 0,
  sourceType,
  sourceSnapshotId = null,
  sourceActionRequestId = null,
  dedupeKey = null,
  occurredAt = new Date().toISOString(),
  expiresAt = null,
  createdBy = null,
}: StoreAgentMemoryArgs) {
  const {
    data,
    error,
  } =
    await admin.rpc(
      "agent_store_memory_item",
      {
        p_agent_user_id:
          agentUserId,

        p_memory_type:
          memoryType,

        p_domain:
          domain,

        p_subject_key:
          subjectKey,

        p_summary:
          summary
            .trim()
            .slice(
              0,
              500,
            ),

        p_content:
          content,

        p_importance:
          clamp(
            importance,
            0,
            1,
          ),

        p_confidence:
          clamp(
            confidence,
            0,
            1,
          ),

        p_valence:
          clamp(
            valence,
            -1,
            1,
          ),

        p_source_type:
          sourceType,

        p_source_snapshot_id:
          sourceSnapshotId,

        p_source_action_request_id:
          sourceActionRequestId,

        p_dedupe_key:
          dedupeKey,

        p_occurred_at:
          occurredAt,

        p_expires_at:
          expiresAt,

        p_created_by:
          createdBy,
      },
    );

  if (
    error ||
    !data
  ) {
    throw new Error(
      error?.message ||
      "Agent memory could not be stored.",
    );
  }

  return String(
    data,
  );
}

export async function storeAgentMemoryCheckpoint({
  admin,
  agentUserId,
  sourceSnapshotId = null,
  summary,
  memoryIds,
  createdBy = null,
}: {
  admin:
    SupabaseClient;

  agentUserId:
    string;

  sourceSnapshotId?:
    string | null;

  summary:
    Record<
      string,
      unknown
    >;

  memoryIds:
    string[];

  createdBy?:
    string | null;
}) {
  const stateHash =
    hashMemoryState({
      checkpointVersion:
        AGENT_MEMORY_CHECKPOINT_VERSION,

      agentUserId,

      sourceSnapshotId,

      summary,

      memoryIds:
        [
          ...memoryIds,
        ].sort(),
    });

  const {
    data,
    error,
  } =
    await admin.rpc(
      "agent_store_memory_checkpoint",
      {
        p_agent_user_id:
          agentUserId,

        p_checkpoint_version:
          AGENT_MEMORY_CHECKPOINT_VERSION,

        p_source_snapshot_id:
          sourceSnapshotId,

        p_summary:
          summary,

        p_memory_ids:
          memoryIds,

        p_state_hash:
          stateHash,

        p_created_by:
          createdBy,
      },
    );

  if (
    error ||
    !data
  ) {
    throw new Error(
      error?.message ||
      "Agent memory checkpoint could not be stored.",
    );
  }

  return {
    checkpointId:
      String(
        data,
      ),

    stateHash,
  };
}