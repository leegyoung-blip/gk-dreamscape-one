import "server-only";

export const AGENT_WORLD_SNAPSHOT_VERSION =
  1;

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

export type FoundationObservationSourceKey =
  (typeof FOUNDATION_OBSERVATION_SOURCE_KEYS)[number];

export type AgentObservationSection = {
  source_key:
    FoundationObservationSourceKey;

  source_version:
    number;

  payload:
    Record<
      string,
      unknown
    >;

  payload_hash:
    string;
};

export type AgentWorldObservationSummary = {
  agentCode:
    string;

  lifecycleStatus:
    string;

  worldAffinity:
    string;

  dtBalance:
    number;

  dgBalance:
    number;

  activeGoalCount:
    number;

  simulationAccessTier:
    string;

  engineEnabled:
    boolean;

  observedSourceCount:
    number;
};

export type CapturedAgentWorldSnapshot = {
  snapshotId:
    string;

  runId:
    string;

  agentUserId:
    string;

  agentCode:
    string;

  observedAt:
    string;

  stateHash:
    string;

  summary:
    AgentWorldObservationSummary;

  sections:
    AgentObservationSection[];
};