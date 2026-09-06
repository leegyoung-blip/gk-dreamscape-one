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
  | "agent_execute_synthetic_activity_v1"
  | "agent_execute_synthetic_economy_spend_v1";


export type AgentExecutionAdapter = {
  actionKey:
    AgentExecutableActionKey;

  adapterKey:
    string;

  rpcName:
    AgentExecutionRpcName;

  requiresStudentRole:
    boolean;
};


export type AgentExecutionResult =
  | {
      ok:
        true;

      actionRequestId:
        string;

      actionKey:
        string;

      result:
        Record<
          string,
          unknown
        >;
    }
  | {
      ok:
        false;

      actionRequestId:
        string;

      actionKey:
        string;

      failureId:
        string;

      error:
        string;
    };


/*
 * Retained for the legacy execution-QA and payload-builder tooling.
 *
 * The Phase 3F / Phase 4A live runtime does NOT generate real quiz scores,
 * but the admin QA route still compiles against this type.
 */
export type SyntheticPerformanceProfile = {
  /*
   * Stable deterministic seed used by the old QA payload builders.
   */
  seed:
    string;

  /*
   * 0–1 probability used by the old QA payload builders.
   */
  accuracy:
    number;

  /*
   * Human-readable percentage used by:
   *
   *   app/api/admin/agents/execution-qa/route.ts
   *
   * Example:
   *   accuracy = 0.82
   *   expectedAccuracyPercent = 82
   */
  expectedAccuracyPercent:
    number;
};