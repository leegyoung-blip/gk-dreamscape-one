import type { SupabaseClient } from "@supabase/supabase-js";

export const WORLD_OBSERVATION_SOURCE_KEYS = [
  "nova.learning",
  "nova.knowledge_arena",
  "nova.rover",
  "nova.home",
  "nova.think",
  "milo.categories",
  "milo.exchange",
  "milo.business_builder",
] as const;

export type WorldObservationSourceKey =
  (typeof WORLD_OBSERVATION_SOURCE_KEYS)[number];

export type WorldAdminClient = SupabaseClient<any>;

export type WorldAdapterContext = {
  admin: WorldAdminClient;
  agentUserId: string;
  observedAt?: string;
};

export type WorldAdapterPayload = {
  sourceKey: WorldObservationSourceKey;
  schemaVersion: 1;
  observedAt: string;
  available: boolean;
  partial: boolean;
  errors: string[];
  data: Record<string, unknown>;
};

export type WorldAdapter = (
  context: WorldAdapterContext,
) => Promise<WorldAdapterPayload>;
