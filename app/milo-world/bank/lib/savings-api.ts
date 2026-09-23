import { supabase } from "@/lib/supabase";
import type {
  CreateSavingsGoalInput,
  SavingsGoal,
  SavingsMovement,
  SavingsGoalLinkedType,
  SavingsGoalStatus,
  SavingsMovementType,
  UpdateSavingsGoalInput,
} from "./savings-types";

type SavingsGoalRow = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number | string;
  saved_amount: number | string;
  icon: string;
  linked_type: string;
  linked_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type SavingsMovementRow = {
  id: string;
  user_id: string;
  savings_goal_id: string;
  movement_type: string;
  amount: number | string;
  balance_after: number | string;
  title: string;
  created_at: string;
};

function toSavingsGoal(row: SavingsGoalRow): SavingsGoal {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    targetAmount: Number(row.target_amount || 0),
    savedAmount: Number(row.saved_amount || 0),
    icon: row.icon,
    linkedType: row.linked_type as SavingsGoalLinkedType,
    linkedId: row.linked_id,
    status: row.status as SavingsGoalStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

function toSavingsMovement(row: SavingsMovementRow): SavingsMovement {
  return {
    id: row.id,
    userId: row.user_id,
    savingsGoalId: row.savings_goal_id,
    movementType: row.movement_type as SavingsMovementType,
    amount: Number(row.amount || 0),
    balanceAfter: Number(row.balance_after || 0),
    title: row.title,
    createdAt: row.created_at,
  };
}

export async function listSavingsGoals() {
  const { data, error } = await supabase
    .from("milo_bank_savings_goals")
    .select(
      "id,user_id,name,target_amount,saved_amount,icon,linked_type,linked_id,status,created_at,updated_at,completed_at",
    )
    .neq("status", "archived")
    .order("status", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return ((data || []) as SavingsGoalRow[]).map(toSavingsGoal);
}

export async function listSavingsMovements(limit = 50) {
  const { data, error } = await supabase
    .from("milo_bank_savings_movements")
    .select(
      "id,user_id,savings_goal_id,movement_type,amount,balance_after,title,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data || []) as SavingsMovementRow[]).map(toSavingsMovement);
}

export async function createSavingsGoal(input: CreateSavingsGoalInput) {
  const { data, error } = await supabase.rpc("create_milo_bank_savings_goal", {
    p_name: input.name,
    p_target_amount: Math.round(input.targetAmount),
    p_icon: input.icon || "✦",
    p_linked_type: input.linkedType || "custom",
    p_linked_id: input.linkedId || null,
  });

  if (error) throw error;
  return toSavingsGoal(data as SavingsGoalRow);
}

export async function updateSavingsGoal(input: UpdateSavingsGoalInput) {
  const { data, error } = await supabase.rpc("update_milo_bank_savings_goal", {
    p_goal_id: input.goalId,
    p_name: input.name,
    p_target_amount: Math.round(input.targetAmount),
    p_icon: input.icon || "✦",
  });

  if (error) throw error;
  return toSavingsGoal(data as SavingsGoalRow);
}

export async function depositToSavings(goalId: string, amount: number) {
  const { data, error } = await supabase.rpc("deposit_milo_bank_savings", {
    p_goal_id: goalId,
    p_amount: Math.round(amount),
  });

  if (error) throw error;
  return toSavingsGoal(data as SavingsGoalRow);
}

export async function withdrawFromSavings(goalId: string, amount: number) {
  const { data, error } = await supabase.rpc("withdraw_milo_bank_savings", {
    p_goal_id: goalId,
    p_amount: Math.round(amount),
  });

  if (error) throw error;
  return toSavingsGoal(data as SavingsGoalRow);
}

export async function archiveSavingsGoal(goalId: string) {
  const { data, error } = await supabase.rpc("archive_milo_bank_savings_goal", {
    p_goal_id: goalId,
  });

  if (error) throw error;
  return toSavingsGoal(data as SavingsGoalRow);
}
