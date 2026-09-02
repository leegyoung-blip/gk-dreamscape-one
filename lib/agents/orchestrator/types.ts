import "server-only";

export type OrchestratorSessionPlan = {
  sessionNumber: number;
  dueMinute: number;
  plannedDecisions: number;
};

export type OrchestratorDayPlan = {
  simulationDayIndex: number;
  sessionCount: number;
  sessions: OrchestratorSessionPlan[];
};

export type RuntimeDecisionResult = {
  decisionId: string;
  snapshotId: string;
  selectedActionKey: string;
  selectedActionVersion: number;
  selectedParameters: Record<string, unknown>;
  selectedScore: number;
  reasoningSummary: string;
};

export type OrchestratorTickSummary = {
  ok: boolean;
  skipped: boolean;
  reason?: string;
  simulationDayIndex?: number;
  minuteInSimulationDay?: number;
  agentsConsidered: number;
  sessionsClaimed: number;
  sessionsCompleted: number;
  decisionsAttempted: number;
  decisionsCompleted: number;
  decisionsFailed: number;
};
