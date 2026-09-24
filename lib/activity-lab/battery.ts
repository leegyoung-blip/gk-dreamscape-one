import { supabase } from "@/lib/supabase";

export type ActivityLabBatteryState = {
  batteryBolts: number;
  bonusBolts: number;
  totalBolts: number;
  capacityBolts: number;
  rechargeIntervalSeconds: number;
  rechargeBoltsPerInterval: number;
  runCostBolts: number;
  nextRechargeAt: string | null;
  fullRechargeAt: string | null;
};

export type ActivityLabBatteryConsumeRunResult = {
  accepted: boolean;
  alreadyCharged: boolean;
  boltsCharged: number;
  batteryBolts: number;
  bonusBolts: number;
  totalBolts: number;
  capacityBolts: number;
  runCostBolts: number;
  nextRechargeAt: string | null;
  fullRechargeAt: string | null;
};

type BatteryGetRow = {
  battery_bolts: number;
  bonus_bolts: number;
  total_bolts: number;
  capacity_bolts: number;
  recharge_interval_seconds: number;
  recharge_bolts_per_interval: number;
  run_cost_bolts: number;
  next_recharge_at: string | null;
  full_recharge_at: string | null;
};

type BatteryConsumeRow = {
  accepted: boolean;
  already_charged: boolean;
  bolts_charged: number;
  battery_bolts: number;
  bonus_bolts: number;
  total_bolts: number;
  capacity_bolts: number;
  run_cost_bolts: number;
  next_recharge_at: string | null;
  full_recharge_at: string | null;
};

function firstRow<T>(data: T[] | T | null): T | null {
  if (!data) return null;
  return Array.isArray(data) ? (data[0] ?? null) : data;
}

function mapState(row: BatteryGetRow): ActivityLabBatteryState {
  return {
    batteryBolts: Number(row.battery_bolts ?? 0),
    bonusBolts: Number(row.bonus_bolts ?? 0),
    totalBolts: Number(row.total_bolts ?? 0),
    capacityBolts: Number(row.capacity_bolts ?? 100),
    rechargeIntervalSeconds: Number(row.recharge_interval_seconds ?? 3600),
    rechargeBoltsPerInterval: Number(row.recharge_bolts_per_interval ?? 10),
    runCostBolts: Number(row.run_cost_bolts ?? 5),
    nextRechargeAt: row.next_recharge_at ?? null,
    fullRechargeAt: row.full_recharge_at ?? null,
  };
}

export async function getActivityLabBattery(): Promise<ActivityLabBatteryState> {
  const { data, error } = await supabase.rpc("activity_lab_battery_get");
  if (error) throw error;

  const row = firstRow(data as BatteryGetRow[] | BatteryGetRow | null);
  if (!row) throw new Error("Activity Lab battery state was not returned.");
  return mapState(row);
}

export async function consumeActivityLabBatteryRun(
  runKey: string,
  gameKey: string,
): Promise<ActivityLabBatteryConsumeRunResult> {
  const { data, error } = await supabase.rpc("activity_lab_battery_consume_run", {
    p_run_key: runKey,
    p_game_key: gameKey,
  });

  if (error) throw error;

  const row = firstRow(data as BatteryConsumeRow[] | BatteryConsumeRow | null);
  if (!row) throw new Error("Activity Lab run-charge response was not returned.");

  return {
    accepted: Boolean(row.accepted),
    alreadyCharged: Boolean(row.already_charged),
    boltsCharged: Number(row.bolts_charged ?? 0),
    batteryBolts: Number(row.battery_bolts ?? 0),
    bonusBolts: Number(row.bonus_bolts ?? 0),
    totalBolts: Number(row.total_bolts ?? 0),
    capacityBolts: Number(row.capacity_bolts ?? 100),
    runCostBolts: Number(row.run_cost_bolts ?? 5),
    nextRechargeAt: row.next_recharge_at ?? null,
    fullRechargeAt: row.full_recharge_at ?? null,
  };
}

export function createActivityLabRunKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}
