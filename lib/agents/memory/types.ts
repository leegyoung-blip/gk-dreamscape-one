import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

export const AGENT_MEMORY_CHECKPOINT_VERSION =
  1;

export type AgentMemoryType =
  | "episodic"
  | "semantic"
  | "preference"
  | "economic"
  | "learning"
  | "goal"
  | "system";

export type AgentMemoryDomain =
  | "global"
  | "nova"
  | "milo"
  | "economy"
  | "learning"
  | "system";

export type AgentMemorySourceType =
  | "observation"
  | "action"
  | "system"
  | "admin"
  | "policy";

export type AgentMemoryRequestSource =
  | "admin"
  | "policy"
  | "scheduler"
  | "system"
  | "test";

export type AgentMemoryItem = {
  id: string;

  agentUserId: string;

  memoryType:
    AgentMemoryType;

  domain:
    AgentMemoryDomain;

  subjectKey:
    string | null;

  summary:
    string;

  content:
    Record<
      string,
      unknown
    >;

  importance:
    number;

  confidence:
    number;

  valence:
    number;

  sourceType:
    AgentMemorySourceType;

  sourceSnapshotId:
    string | null;

  sourceActionRequestId:
    string | null;

  dedupeKey:
    string | null;

  occurredAt:
    string;

  expiresAt:
    string | null;

  recallCount:
    number;

  lastRecalledAt:
    string | null;
};

export type StoreAgentMemoryArgs = {
  admin:
    SupabaseClient;

  agentUserId:
    string;

  memoryType:
    AgentMemoryType;

  domain:
    AgentMemoryDomain;

  subjectKey?:
    string | null;

  summary:
    string;

  content?:
    Record<
      string,
      unknown
    >;

  importance?:
    number;

  confidence?:
    number;

  valence?:
    number;

  sourceType:
    AgentMemorySourceType;

  sourceSnapshotId?:
    string | null;

  sourceActionRequestId?:
    string | null;

  dedupeKey?:
    string | null;

  occurredAt?:
    string;

  expiresAt?:
    string | null;

  createdBy?:
    string | null;
};

export type RecallAgentMemoryArgs = {
  admin:
    SupabaseClient;

  agentUserId:
    string;

  requestSource:
    AgentMemoryRequestSource;

  createdBy?:
    string | null;

  query?:
    string;

  domain?:
    AgentMemoryDomain;

  memoryTypes?:
    AgentMemoryType[];

  limit?:
    number;

  minimumImportance?:
    number;
};

export type RecalledAgentMemory = {
  memory:
    AgentMemoryItem;

  score:
    number;

  reasons:
    string[];
};