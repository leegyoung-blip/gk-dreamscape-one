import { supabase } from "@/lib/supabase";

export type ActivityLabBatteryState = {
  batterySeconds: number;
  bonusSeconds: number;
  totalPlayableSeconds: number;
  capacitySeconds: number;
  rechargeRealSecondsPerBatterySecond: number;
  heartbeatTimeoutSeconds: number;
  isDraining: boolean;
  activeSessionId: string | null;
  activeGameKey: string | null;
  activeStartedAt: string | null;
  activeLastHeartbeatAt: string | null;
  fullRechargeAt: string | null;
};

export type ActivityLabBatteryStartResult = {
  accepted: boolean;
  batterySeconds: number;
  bonusSeconds: number;
  totalPlayableSeconds: number;
  capacitySeconds: number;
  activeSessionId: string | null;
  activeGameKey: string | null;
};

export type ActivityLabBatteryHeartbeatResult = {
  accepted: boolean;
  batterySeconds: number;
  bonusSeconds: number;
  totalPlayableSeconds: number;
  depleted: boolean;
  chargedSeconds: number;
};

export type ActivityLabBatteryStopResult = {
  accepted: boolean;
  batterySeconds: number;
  bonusSeconds: number;
  totalPlayableSeconds: number;
  chargedSeconds: number;
  fullRechargeAt: string | null;
};

type BatteryGetRow = {
  battery_seconds: number;
  bonus_seconds: number;
  total_playable_seconds: number;
  capacity_seconds: number;
  recharge_real_seconds_per_battery_second: number;
  heartbeat_timeout_seconds: number;
  is_draining: boolean;
  active_session_id: string | null;
  active_game_key: string | null;
  active_started_at: string | null;
  active_last_heartbeat_at: string | null;
  full_recharge_at: string | null;
};

type BatteryStartRow = {
  accepted: boolean;
  battery_seconds: number;
  bonus_seconds: number;
  total_playable_seconds: number;
  capacity_seconds: number;
  active_session_id: string | null;
  active_game_key: string | null;
};

type BatteryHeartbeatRow = {
  accepted: boolean;
  battery_seconds: number;
  bonus_seconds: number;
  total_playable_seconds: number;
  depleted: boolean;
  charged_seconds: number;
};

type BatteryStopRow = {
  accepted: boolean;
  battery_seconds: number;
  bonus_seconds: number;
  total_playable_seconds: number;
  charged_seconds: number;
  full_recharge_at: string | null;
};

function firstRow<T>(data: T[] | T | null): T | null {
  if (!data) return null;
  return Array.isArray(data) ? (data[0] ?? null) : data;
}

export async function getActivityLabBattery(): Promise<ActivityLabBatteryState> {
  const { data, error } = await supabase.rpc("activity_lab_battery_get");
  if (error) throw error;
  const row = firstRow(data as BatteryGetRow[] | BatteryGetRow | null);
  if (!row) throw new Error("Activity Lab battery state was not returned.");
  return {
    batterySeconds: Number(row.battery_seconds ?? 0),
    bonusSeconds: Number(row.bonus_seconds ?? 0),
    totalPlayableSeconds: Number(row.total_playable_seconds ?? 0),
    capacitySeconds: Number(row.capacity_seconds ?? 0),
    rechargeRealSecondsPerBatterySecond: Number(row.recharge_real_seconds_per_battery_second ?? 10),
    heartbeatTimeoutSeconds: Number(row.heartbeat_timeout_seconds ?? 45),
    isDraining: Boolean(row.is_draining),
    activeSessionId: row.active_session_id ?? null,
    activeGameKey: row.active_game_key ?? null,
    activeStartedAt: row.active_started_at ?? null,
    activeLastHeartbeatAt: row.active_last_heartbeat_at ?? null,
    fullRechargeAt: row.full_recharge_at ?? null,
  };
}

export async function startActivityLabBatteryDrain(sessionId: string, gameKey: string): Promise<ActivityLabBatteryStartResult> {
  const { data, error } = await supabase.rpc("activity_lab_battery_start", { p_session_id: sessionId, p_game_key: gameKey });
  if (error) throw error;
  const row = firstRow(data as BatteryStartRow[] | BatteryStartRow | null);
  if (!row) throw new Error("Activity Lab battery start response was not returned.");
  return {
    accepted: Boolean(row.accepted),
    batterySeconds: Number(row.battery_seconds ?? 0),
    bonusSeconds: Number(row.bonus_seconds ?? 0),
    totalPlayableSeconds: Number(row.total_playable_seconds ?? 0),
    capacitySeconds: Number(row.capacity_seconds ?? 0),
    activeSessionId: row.active_session_id ?? null,
    activeGameKey: row.active_game_key ?? null,
  };
}

export async function heartbeatActivityLabBattery(sessionId: string): Promise<ActivityLabBatteryHeartbeatResult> {
  const { data, error } = await supabase.rpc("activity_lab_battery_heartbeat", { p_session_id: sessionId });
  if (error) throw error;
  const row = firstRow(data as BatteryHeartbeatRow[] | BatteryHeartbeatRow | null);
  if (!row) throw new Error("Activity Lab battery heartbeat response was not returned.");
  return {
    accepted: Boolean(row.accepted),
    batterySeconds: Number(row.battery_seconds ?? 0),
    bonusSeconds: Number(row.bonus_seconds ?? 0),
    totalPlayableSeconds: Number(row.total_playable_seconds ?? 0),
    depleted: Boolean(row.depleted),
    chargedSeconds: Number(row.charged_seconds ?? 0),
  };
}

export async function stopActivityLabBatteryDrain(sessionId: string): Promise<ActivityLabBatteryStopResult> {
  const { data, error } = await supabase.rpc("activity_lab_battery_stop", { p_session_id: sessionId });
  if (error) throw error;
  const row = firstRow(data as BatteryStopRow[] | BatteryStopRow | null);
  if (!row) throw new Error("Activity Lab battery stop response was not returned.");
  return {
    accepted: Boolean(row.accepted),
    batterySeconds: Number(row.battery_seconds ?? 0),
    bonusSeconds: Number(row.bonus_seconds ?? 0),
    totalPlayableSeconds: Number(row.total_playable_seconds ?? 0),
    chargedSeconds: Number(row.charged_seconds ?? 0),
    fullRechargeAt: row.full_recharge_at ?? null,
  };
}

export function createActivityLabBatterySessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}
