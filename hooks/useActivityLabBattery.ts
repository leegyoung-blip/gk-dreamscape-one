"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  consumeActivityLabBatteryRun,
  createActivityLabRunKey,
  getActivityLabBattery,
  type ActivityLabBatteryConsumeRunResult,
  type ActivityLabBatteryState,
} from "@/lib/activity-lab/battery";

type UseActivityLabBatteryOptions = {
  userId?: string | null;
  unlimited?: boolean;
};

type BatteryStatus = "idle" | "loading" | "ready" | "charging" | "error";

const ADMIN_UNLIMITED_STATE: ActivityLabBatteryState = {
  batteryBolts: 100,
  bonusBolts: 0,
  totalBolts: 100,
  capacityBolts: 100,
  rechargeIntervalSeconds: 3600,
  rechargeBoltsPerInterval: 10,
  runCostBolts: 0,
  nextRechargeAt: null,
  fullRechargeAt: null,
};

function readableBatteryError(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;

  if (err && typeof err === "object") {
    const value = err as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };

    const parts = [
      typeof value.message === "string" ? value.message : "",
      typeof value.details === "string" && value.details ? `Details: ${value.details}` : "",
      typeof value.hint === "string" && value.hint ? `Hint: ${value.hint}` : "",
      typeof value.code === "string" && value.code ? `Code: ${value.code}` : "",
    ].filter(Boolean);

    if (parts.length) return parts.join(" | ");
  }

  return fallback;
}

export function useActivityLabBattery({
  userId,
  unlimited = false,
}: UseActivityLabBatteryOptions) {
  const [state, setState] = useState<ActivityLabBatteryState | null>(null);
  const [status, setStatus] = useState<BatteryStatus>(
    userId ? (unlimited ? "ready" : "loading") : "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const chargingRef = useRef(false);
  const mountedRef = useRef(true);
  const rechargeRefreshRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) {
      setState(null);
      setStatus("idle");
      setError(null);
      return null;
    }

    if (unlimited) {
      setState(ADMIN_UNLIMITED_STATE);
      setStatus("ready");
      setError(null);
      return ADMIN_UNLIMITED_STATE;
    }

    setStatus((current) => (current === "charging" ? current : "loading"));
    try {
      const next = await getActivityLabBattery();
      if (!mountedRef.current) return next;
      setState(next);
      setError(null);
      setStatus("ready");
      return next;
    } catch (err) {
      if (!mountedRef.current) return null;
      setError(readableBatteryError(err, "Could not load Activity Lab battery."));
      setStatus("error");
      return null;
    }
  }, [unlimited, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const interval = window.setInterval(() => setNowTick(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const nextAt = state?.nextRechargeAt ? new Date(state.nextRechargeAt).getTime() : 0;
    if (!userId || !nextAt || nowTick < nextAt || rechargeRefreshRef.current) return;

    rechargeRefreshRef.current = true;
    void refresh().finally(() => {
      rechargeRefreshRef.current = false;
    });
  }, [nowTick, refresh, state?.nextRechargeAt, userId]);

  const consumeRun = useCallback(
    async (gameKey: string, runKey = createActivityLabRunKey()): Promise<ActivityLabBatteryConsumeRunResult | null> => {
      if (!userId || chargingRef.current) return null;

      if (unlimited) {
        const result: ActivityLabBatteryConsumeRunResult = {
          accepted: true,
          alreadyCharged: false,
          boltsCharged: 0,
          batteryBolts: 100,
          bonusBolts: 0,
          totalBolts: 100,
          capacityBolts: 100,
          runCostBolts: 0,
          nextRechargeAt: null,
          fullRechargeAt: null,
        };
        setState(ADMIN_UNLIMITED_STATE);
        setStatus("ready");
        setError(null);
        return result;
      }

      chargingRef.current = true;
      setStatus("charging");
      setError(null);

      try {
        const result = await consumeActivityLabBatteryRun(runKey, gameKey);
        if (!mountedRef.current) return result;

        setState((current) => ({
          batteryBolts: result.batteryBolts,
          bonusBolts: result.bonusBolts,
          totalBolts: result.totalBolts,
          capacityBolts: result.capacityBolts,
          rechargeIntervalSeconds: current?.rechargeIntervalSeconds ?? 3600,
          rechargeBoltsPerInterval: current?.rechargeBoltsPerInterval ?? 10,
          runCostBolts: result.runCostBolts,
          nextRechargeAt: result.nextRechargeAt,
          fullRechargeAt: result.fullRechargeAt,
        }));
        setStatus("ready");
        return result;
      } catch (err) {
        if (mountedRef.current) {
          setError(readableBatteryError(err, "Could not charge the Activity Lab run."));
          setStatus("error");
        }
        return null;
      } finally {
        chargingRef.current = false;
      }
    },
    [unlimited, userId],
  );

  const percentage = useMemo(() => {
    const capacity = state?.capacityBolts ?? 0;
    if (capacity <= 0) return 0;
    return Math.max(0, Math.min(100, ((state?.batteryBolts ?? 0) / capacity) * 100));
  }, [state?.batteryBolts, state?.capacityBolts]);

  const nextRechargeInSeconds = useMemo(() => {
    if (!state?.nextRechargeAt) return 0;
    return Math.max(0, Math.ceil((new Date(state.nextRechargeAt).getTime() - nowTick) / 1000));
  }, [nowTick, state?.nextRechargeAt]);

  const fullRechargeInSeconds = useMemo(() => {
    if (!state?.fullRechargeAt) return 0;
    return Math.max(0, Math.ceil((new Date(state.fullRechargeAt).getTime() - nowTick) / 1000));
  }, [nowTick, state?.fullRechargeAt]);

  const runCostBolts = state?.runCostBolts ?? 5;
  const totalBolts = state?.totalBolts ?? 0;

  return {
    state,
    status,
    error,
    batteryBolts: state?.batteryBolts ?? 0,
    bonusBolts: state?.bonusBolts ?? 0,
    totalBolts,
    capacityBolts: state?.capacityBolts ?? 100,
    rechargeIntervalSeconds: state?.rechargeIntervalSeconds ?? 3600,
    rechargeBoltsPerInterval: state?.rechargeBoltsPerInterval ?? 10,
    runCostBolts,
    percentage,
    isFull: Boolean(state && state.batteryBolts >= state.capacityBolts),
    canStartRun: !userId || totalBolts >= runCostBolts,
    isChargingRun: status === "charging",
    nextRechargeAt: state?.nextRechargeAt ? new Date(state.nextRechargeAt) : null,
    fullRechargeAt: state?.fullRechargeAt ? new Date(state.fullRechargeAt) : null,
    nextRechargeInSeconds,
    fullRechargeInSeconds,
    refresh,
    consumeRun,
  };
}
