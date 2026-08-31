import "server-only";

export type AgentActionRequestSource =
  | "admin"
  | "policy"
  | "scheduler"
  | "system"
  | "test";

export type AgentActionRequestedMode =
  | "dry_run"
  | "execute";

export type AgentActionValidationStatus =
  | "validated"
  | "rejected";

export type AgentActionValidationIssue = {
  code: string;

  message: string;

  path?: string;
};

export type AgentActionValidationResult = {
  ok: boolean;

  requestId: string;

  agentUserId: string;

  agentCode: string;

  actionKey: string;

  actionVersion: number;

  snapshotId: string;

  status:
    AgentActionValidationStatus;

  errors:
    AgentActionValidationIssue[];

  warnings:
    AgentActionValidationIssue[];

  context: {
    lifecycleStatus:
      string;

    executionMode:
      string;

    mutationClass:
      string;

    simulationAccessTier:
      string;

    snapshotObservedAt:
      string;

    snapshotAgeSeconds:
      number;

    requiredObservationSources:
      string[];

    observedSources:
      string[];

    requiredEntitlements:
      string[];
  };
};

export type ValidateAgentActionArgs = {
  admin:
    import(
      "@supabase/supabase-js"
    ).SupabaseClient;

  agentUserId:
    string;

  actionKey:
    string;

  actionVersion?:
    number;

  snapshotId:
    string;

  parameters:
    Record<
      string,
      unknown
    >;

  requestSource:
    AgentActionRequestSource;

  requestedMode?:
    AgentActionRequestedMode;

  createdBy:
    string;

  idempotencyKey?:
    string | null;
};