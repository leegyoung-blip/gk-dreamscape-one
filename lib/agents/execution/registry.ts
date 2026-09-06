import "server-only";

import type {
  AgentExecutableActionKey,
  AgentExecutionAdapter,
} from "@/lib/agents/execution/types";

export const AGENT_EXECUTION_ADAPTERS: Record<
  AgentExecutableActionKey,
  AgentExecutionAdapter
> = {
  "nova.learning.attempt_quiz": {
    actionKey: "nova.learning.attempt_quiz",
    adapterKey: "agent.execute.nova.learning.v1",
    rpcName: "agent_execute_nova_learning_v1",
    requiresStudentRole: false,
  },

  "nova.knowledge_arena.attempt_quiz": {
    actionKey: "nova.knowledge_arena.attempt_quiz",
    adapterKey: "agent.execute.nova.knowledge_arena.v1",
    rpcName: "agent_execute_nova_knowledge_arena_v1",
    requiresStudentRole: false,
  },

  "nova.think.attempt_activity": {
    actionKey: "nova.think.attempt_activity",
    adapterKey: "agent.execute.nova.think.v1",
    rpcName: "agent_execute_nova_think_v1",
    requiresStudentRole: false,
  },

  "nova.rover.run_challenge": {
    actionKey: "nova.rover.run_challenge",
    adapterKey: "agent.execute.nova.rover.v1",
    rpcName: "agent_execute_nova_rover_v1",
    requiresStudentRole: false,
  },

  "milo.categories.attempt_quiz": {
    actionKey: "milo.categories.attempt_quiz",
    adapterKey: "agent.execute.milo.categories.v1",
    rpcName: "agent_execute_milo_categories_v1",
    requiresStudentRole: false,
  },

  "economy.synthetic_spend": {
    actionKey: "economy.synthetic_spend",
    adapterKey: "economy.synthetic_spend.v1",
    rpcName: "agent_execute_synthetic_economy_spend_v1",
    requiresStudentRole: false,
  },
};

export function isAgentExecutableActionKey(
  value: string,
): value is AgentExecutableActionKey {
  return Object.prototype.hasOwnProperty.call(
    AGENT_EXECUTION_ADAPTERS,
    value,
  );
}