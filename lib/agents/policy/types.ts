import "server-only";

export type PolicyActionKey =
  | "system.wait"
  | "nova.learning.attempt_quiz"
  | "nova.knowledge_arena.attempt_quiz"
  | "nova.think.attempt_activity"
  | "nova.rover.run_challenge"
  | "milo.categories.attempt_quiz";

export type PolicyCandidate = {
  actionKey:
    PolicyActionKey;

  actionVersion:
    number;

  parameters:
    Record<
      string,
      unknown
    >;

  score:
    number;

  available:
    boolean;

  contractStatus:
    string;

  reasons:
    string[];

  targetLabel:
    string |
    null;
};

export type RuleBasedPolicyInput = {
  agentUserId:
    string;

  agentCode:
    string;

  snapshotId:
    string;

  snapshotStateHash:
    string;

  decisionIndex:
    number;

  sections:
    Array<{
      source_key:
        string;

      source_version:
        number;

      payload:
        Record<
          string,
          unknown
        >;
    }>;

  recalledMemories:
    Array<{
      id:
        string;

      memoryType:
        string;

      domain:
        string;

      summary:
        string;

      content:
        Record<
          string,
          unknown
        >;

      score:
        number;
    }>;

  contractStatusByAction:
    Partial<
      Record<
        PolicyActionKey,
        {
          status:
            string;

          executionMode:
            string;
        }
      >
    >;
};

export type RuleBasedPolicyDecision = {
  policyKey:
    "rule_based";

  policyVersion:
    1;

  policyRuntime:
    "RuleBasedPolicyV1";

  agentUserId:
    string;

  agentCode:
    string;

  snapshotId:
    string;

  decisionIndex:
    number;

  selected:
    PolicyCandidate;

  candidates:
    PolicyCandidate[];

  reasoningSummary:
    string;

  inputSummary:
    Record<
      string,
      unknown
    >;

  recalledMemoryIds:
    string[];

  executionAllowed:
    false;
};
