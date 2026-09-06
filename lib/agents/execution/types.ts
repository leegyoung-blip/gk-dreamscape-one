import "server-only";

export type AgentExecutableActionKey =
  | "nova.learning.attempt_quiz"
  | "nova.knowledge_arena.attempt_quiz"
  | "nova.think.attempt_activity"
  | "nova.rover.run_challenge"
  | "milo.categories.attempt_quiz"
  | "economy.synthetic_spend";

export type AgentExecutionRpcName =
  | "agent_execute_nova_learning_v1"
  | "agent_execute_nova_knowledge_arena_v1"
  | "agent_execute_nova_think_v1"
  | "agent_execute_nova_rover_v1"
  | "agent_execute_milo_categories_v1"
  | "agent_execute_synthetic_economy_spend_v1";

export type AgentExecutionAdapter = {
  actionKey: AgentExecutableActionKey;
  adapterKey: string;
  rpcName: AgentExecutionRpcName;
  requiresStudentRole: boolean;
};

export type AgentExecutionResult =
  | {
      ok: true;
      actionRequestId: string;
      actionKey: string;
      result: Record<string, unknown>;
    }
  | {
      ok: false;
      actionRequestId: string;
      actionKey: string;
      failureId: string;
      error: string;
    };

/*
 * Retained for older payload-builder modules that may still exist in the
 * repository even though the Phase 3F / 4A runtime no longer uses them.
 */
export type SyntheticPerformanceProfile = {
  seed: string;
  accuracy: number;
};