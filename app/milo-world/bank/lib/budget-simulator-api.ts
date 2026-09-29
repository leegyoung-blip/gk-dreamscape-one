import { supabase } from "@/lib/supabase";
import type {
  BudgetDifficulty,
  BudgetScenarioKey,
  BudgetSimulationRun,
  BudgetSimulationState,
  BudgetStageKey,
} from "./budget-simulator-types";

type BudgetRunRpcRow = {
  run_id: string;
  scenario_key: string;
  difficulty: string;
  scenario_seed: number | string;
  status: string;
  current_stage: string;
  current_day: number | string;
  state: unknown;
  checkpoint_version: number | string;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
};

function messageFrom(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = (error as { message: string }).message;
    if (/column reference [\"']?(status|checkpoint_version)[\"']? is ambiguous/i.test(message)) {
      return "Budget Simulator database functions need the 4A RPC ambiguity fix. Run PHASE-4A-SIMULATION-RPC-AMBIGUITY-FIX.sql.";
    }
    if (/complete_milo_finance_budget_simulation/i.test(message)) {
      return "Budget Simulator completion setup is missing. Run PHASE-4A6-BUDGET-WHAT-IF-COMPLETION.sql.";
    }
    if (/record_milo_finance_budget_simulation_evidence/i.test(message)) {
      return "Budget Simulator evidence setup is missing. Run PHASE-4A5-BUDGET-RESULTS-EVIDENCE.sql.";
    }
    if (/milo_finance_simulation_runs|milo_finance_budget_simulation/i.test(message)) {
      return "Budget Simulator setup is missing. Run PHASE-4A1-BUDGET-SIMULATOR-FOUNDATION.sql.";
    }
    return message;
  }

  return "The Budget Simulator could not be loaded.";
}

function normaliseState(
  raw: unknown,
  fallback: {
    scenarioKey: BudgetScenarioKey;
    difficulty: BudgetDifficulty;
    scenarioSeed: number;
    currentStage: BudgetStageKey;
    currentDay: number;
  },
): BudgetSimulationState {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  return {
    schemaVersion: 1,
    stage: (source.stage as BudgetStageKey) || fallback.currentStage,
    currentDay: Number(source.currentDay ?? fallback.currentDay) || 1,
    completedStages: Array.isArray(source.completedStages)
      ? (source.completedStages as BudgetStageKey[])
      : [],
    scenarioKey:
      (source.scenarioKey as BudgetScenarioKey) || fallback.scenarioKey,
    difficulty:
      (source.difficulty as BudgetDifficulty) || fallback.difficulty,
    scenarioSeed: Number(source.scenarioSeed ?? fallback.scenarioSeed) || 1,
    data:
      source.data && typeof source.data === "object" && !Array.isArray(source.data)
        ? (source.data as BudgetSimulationState["data"])
        : {},
  };
}

function normaliseRun(row: BudgetRunRpcRow): BudgetSimulationRun {
  const scenarioKey = row.scenario_key as BudgetScenarioKey;
  const difficulty = row.difficulty as BudgetDifficulty;
  const scenarioSeed = Number(row.scenario_seed) || 1;
  const currentStage = row.current_stage as BudgetStageKey;
  const currentDay = Number(row.current_day) || 1;

  return {
    id: row.run_id,
    scenarioKey,
    difficulty,
    scenarioSeed,
    status: row.status as BudgetSimulationRun["status"],
    currentStage,
    currentDay,
    state: normaliseState(row.state, {
      scenarioKey,
      difficulty,
      scenarioSeed,
      currentStage,
      currentDay,
    }),
    checkpointVersion: Number(row.checkpoint_version) || 1,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

function firstRow(data: unknown) {
  if (Array.isArray(data)) return data[0] as BudgetRunRpcRow | undefined;
  return data as BudgetRunRpcRow | null | undefined;
}

export async function loadActiveBudgetSimulation() {
  const { data, error } = await supabase.rpc(
    "get_milo_finance_budget_simulation",
  );

  if (error) throw new Error(messageFrom(error));
  const row = firstRow(data);
  return row ? normaliseRun(row) : null;
}

export async function startBudgetSimulation(input: {
  scenarioKey: BudgetScenarioKey;
  difficulty: BudgetDifficulty;
  scenarioSeed: number;
}) {
  const { data, error } = await supabase.rpc(
    "start_milo_finance_budget_simulation",
    {
      p_scenario_key: input.scenarioKey,
      p_difficulty: input.difficulty,
      p_scenario_seed: input.scenarioSeed,
    },
  );

  if (error) throw new Error(messageFrom(error));
  const row = firstRow(data);
  if (!row) throw new Error("The Budget Simulator did not return a new run.");
  return normaliseRun(row);
}

export async function saveBudgetSimulationCheckpoint(input: {
  run: BudgetSimulationRun;
  currentStage: BudgetStageKey;
  currentDay: number;
  state: BudgetSimulationState;
}) {
  const { data, error } = await supabase.rpc(
    "save_milo_finance_budget_simulation_checkpoint",
    {
      p_run_id: input.run.id,
      p_current_stage: input.currentStage,
      p_current_day: input.currentDay,
      p_state: input.state,
      p_expected_version: input.run.checkpointVersion,
    },
  );

  if (error) throw new Error(messageFrom(error));
  const row = firstRow(data);
  if (!row) throw new Error("The Budget Simulator checkpoint was not saved.");
  return normaliseRun(row);
}

export async function abandonBudgetSimulation(runId: string) {
  const { error } = await supabase.rpc("abandon_milo_finance_budget_simulation", {
    p_run_id: runId,
  });

  if (error) throw new Error(messageFrom(error));
}


export async function recordBudgetSimulationEvidence(runId: string) {
  const { error } = await supabase.rpc(
    "record_milo_finance_budget_simulation_evidence",
    { p_run_id: runId },
  );

  if (error) throw new Error(messageFrom(error));
  return true;
}


export async function completeBudgetSimulation(runId: string) {
  const { data, error } = await supabase.rpc(
    "complete_milo_finance_budget_simulation",
    { p_run_id: runId },
  );

  if (error) throw new Error(messageFrom(error));
  const row = firstRow(data);
  if (!row) throw new Error("The Budget Simulator completion was not saved.");
  return normaliseRun(row);
}
