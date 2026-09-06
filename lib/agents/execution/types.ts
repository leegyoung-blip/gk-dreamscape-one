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
 * Legacy execution-QA compatibility type.
 *
 * The live Phase 3F / Phase 4A runtime no longer generates real quiz scores,
 * but older QA/payload tooling still imports this shape and must continue
 * compiling.
 */
export type SyntheticPerformanceProfile = {
  /*
   * 0–1 synthetic accuracy probability.
   */
  accuracy:
    number;

  /*
   * Human-readable equivalent of accuracy.
   * Example: 0.82 -> 82.
   */
  expectedAccuracyPercent:
    number;

  /*
   * Deterministic seed used by legacy synthetic payload generators.
   */
  seed:
    string;

  /*
   * Diagnostic information explaining how the synthetic accuracy was derived.
   *
   * Kept as unknown deliberately because it is compatibility/QA metadata and
   * is not consumed by the Phase 4A live runtime.
   */
  basis:
    unknown;
};