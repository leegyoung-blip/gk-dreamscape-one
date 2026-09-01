import "server-only";

import {
  WORLD_OBSERVATION_SOURCE_KEYS,
  type WorldObservationSourceKey,
} from "@/lib/agents/world/types";

export const AGENT_WORLD_SNAPSHOT_VERSION = 1;

export const FOUNDATION_OBSERVATION_SOURCE_KEYS = [
  "identity.profile",
  "identity.agent",
  "identity.persona",
  "identity.goals",
  "identity.cohort",
  "identity.policy",
  "economy.wallet",
  "economy.recent_transactions",
  "access.simulation_entitlement",
  "system.agent_settings",
] as const;

export const ALL_OBSERVATION_SOURCE_KEYS = [
  ...FOUNDATION_OBSERVATION_SOURCE_KEYS,
  ...WORLD_OBSERVATION_SOURCE_KEYS,
] as const;

export type FoundationObservationSourceKey =
  (typeof FOUNDATION_OBSERVATION_SOURCE_KEYS)[number];

export type AgentObservationSourceKey =
  | FoundationObservationSourceKey
  | WorldObservationSourceKey;

export type AgentObservationSection = {
  source_key: AgentObservationSourceKey;
  source_version: number;
  payload: Record<string, unknown>;
  payload_hash: string;
};

export type AgentWorldObservationSummary = {
  agentCode: string;
  lifecycleStatus: string;
  worldAffinity: string;
  dtBalance: number;
  dgBalance: number;
  activeGoalCount: number;
  simulationAccessTier: string;
  engineEnabled: boolean;
  observedSourceCount: number;
  foundationSourceCount: number;
  worldSourceCount: number;
  partialWorldSourceCount: number;
  unavailableWorldSourceCount: number;
};

export type CapturedAgentWorldSnapshot = {
  snapshotId: string;
  runId: string;
  agentUserId: string;
  agentCode: string;
  observedAt: string;
  stateHash: string;
  summary: AgentWorldObservationSummary;
  sections: AgentObservationSection[];
};
