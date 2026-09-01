import "server-only";

export type AgentExecutableActionKey =
  | "nova.learning.attempt_quiz"
  | "nova.knowledge_arena.attempt_quiz"
  | "nova.think.attempt_activity"
  | "nova.rover.run_challenge"
  | "milo.categories.attempt_quiz";

export type AgentExecutionAdapter = {
  actionKey: AgentExecutableActionKey;
  adapterKey: string;
  rpcName:
    | "agent_execute_nova_learning_v1"
    | "agent_execute_nova_knowledge_arena_v1"
    | "agent_execute_nova_think_v1"
    | "agent_execute_nova_rover_v1"
    | "agent_execute_milo_categories_v1";
  requiresStudentRole: boolean;
};

export type SyntheticPerformanceProfile = {
  accuracy: number;
  expectedAccuracyPercent: number;
  seed: string;
  basis: string[];
};

export type AgentExecutionResult = {
  ok: boolean;
  actionRequestId: string;
  actionKey: string;
  result?: Record<string, unknown>;
  failureId?: string | null;
  error?: string;
};
