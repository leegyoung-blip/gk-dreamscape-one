"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createActivityLabBatterySessionId,
  getActivityLabBattery,
  heartbeatActivityLabBattery,
  startActivityLabBatteryDrain,
  stopActivityLabBatteryDrain,
  type ActivityLabBatteryState,
} from "@/lib/activity-lab/battery";

const HEARTBEAT_MS = 10_000;
const DISPLAY_TICK_MS = 1_000;

type UseActivityLabBatteryOptions = {
  userId?: string | null;
  gameKey?: string;
  shouldDrain?: boolean;
  onDepleted?: () => void;
};

type BatteryStatus = "idle" | "loading" | "ready" | "starting" | "draining" | "stopping" | "error";

function drainPreview(base: number, bonus: number, elapsed: number) {
  const baseCharge = Math.min(Math.max(0, base), Math.max(0, elapsed));
  const remaining = Math.max(0, elapsed - baseCharge);
  const bonusCharge = Math.min(Math.max(0, bonus), remaining);
  return { base: Math.max(0, base - baseCharge), bonus: Math.max(0, bonus - bonusCharge) };
}

export function useActivityLabBattery({ userId, gameKey, shouldDrain = false, onDepleted }: UseActivityLabBatteryOptions) {
  const [state, setState] = useState<ActivityLabBatteryState | null>(null);
  const [displayBaseSeconds, setDisplayBaseSeconds] = useState(0);
  const [displayBonusSeconds, setDisplayBonusSeconds] = useState(0);
  const [status, setStatus] = useState<BatteryStatus>(userId ? "loading" : "idle");
  const [error, setError] = useState<string | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  const displayStartedAtRef = useRef<number | null>(null);
  const displayStartBaseRef = useRef(0);
  const displayStartBonusRef = useRef(0);
  const idleStartedAtRef = useRef<number | null>(null);
  const idleStartBaseRef = useRef(0);
  const heartbeatBusyRef = useRef(false);
  const depletedNotifiedRef = useRef(false);
  const mountedRef = useRef(true);
  const onDepletedRef = useRef(onDepleted);

  useEffect(() => { onDepletedRef.current = onDepleted; }, [onDepleted]);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const applyServerValues = useCallback((base: number, bonus: number) => {
    const safeBase = Math.max(0, Math.floor(base));
    const safeBonus = Math.max(0, Math.floor(bonus));
    setDisplayBaseSeconds(safeBase);
    setDisplayBonusSeconds(safeBonus);
    displayStartBaseRef.current = safeBase;
    displayStartBonusRef.current = safeBonus;
    displayStartedAtRef.current = sessionIdRef.current ? Date.now() : null;
    idleStartBaseRef.current = safeBase;
    idleStartedAtRef.current = sessionIdRef.current ? null : Date.now();
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) {
      setState(null); setDisplayBaseSeconds(0); setDisplayBonusSeconds(0); setStatus("idle"); setError(null); return null;
    }
    setStatus((current) => current === "draining" ? current : "loading");
    try {
      const next = await getActivityLabBattery();
      if (!mountedRef.current) return next;
      setState(next); setError(null); applyServerValues(next.batterySeconds, next.bonusSeconds);
      setStatus(next.isDraining ? "draining" : "ready");
      return next;
    } catch (err) {
      if (!mountedRef.current) return null;
      setError(err instanceof Error ? err.message : "Could not load Activity Lab battery."); setStatus("error"); return null;
    }
  }, [applyServerValues, userId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const stopDrain = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!userId || !sessionId) return;
    setStatus("stopping"); sessionIdRef.current = null; displayStartedAtRef.current = null;
    try {
      const result = await stopActivityLabBatteryDrain(sessionId);
      if (!mountedRef.current) return;
      setState((current) => current ? {
        ...current,
        batterySeconds: result.batterySeconds,
        bonusSeconds: result.bonusSeconds,
        totalPlayableSeconds: result.totalPlayableSeconds,
        isDraining: false,
        activeSessionId: null,
        activeGameKey: null,
        activeStartedAt: null,
        activeLastHeartbeatAt: null,
        fullRechargeAt: result.fullRechargeAt,
      } : current);
      applyServerValues(result.batterySeconds, result.bonusSeconds); setError(null); setStatus("ready");
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Could not stop Activity Lab battery drain."); setStatus("error"); void refresh();
    }
  }, [applyServerValues, refresh, userId]);

  const startDrain = useCallback(async () => {
    if (!userId || !gameKey || sessionIdRef.current) return false;
    setStatus("starting"); setError(null); depletedNotifiedRef.current = false;
    const sessionId = createActivityLabBatterySessionId();
    try {
      const result = await startActivityLabBatteryDrain(sessionId, gameKey);
      if (!mountedRef.current) return result.accepted;
      if (!result.accepted) { applyServerValues(result.batterySeconds, result.bonusSeconds); setStatus("ready"); return false; }
      sessionIdRef.current = sessionId;
      displayStartBaseRef.current = result.batterySeconds;
      displayStartBonusRef.current = result.bonusSeconds;
      displayStartedAtRef.current = Date.now();
      setDisplayBaseSeconds(result.batterySeconds); setDisplayBonusSeconds(result.bonusSeconds);
      setState((current) => current ? {
        ...current,
        batterySeconds: result.batterySeconds,
        bonusSeconds: result.bonusSeconds,
        totalPlayableSeconds: result.totalPlayableSeconds,
        capacitySeconds: result.capacitySeconds,
        isDraining: true,
        activeSessionId: result.activeSessionId,
        activeGameKey: result.activeGameKey,
        fullRechargeAt: null,
      } : current);
      setStatus("draining"); return true;
    } catch (err) {
      if (mountedRef.current) { setError(err instanceof Error ? err.message : "Could not start Activity Lab battery drain."); setStatus("error"); }
      return false;
    }
  }, [applyServerValues, gameKey, userId]);

  const heartbeat = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || heartbeatBusyRef.current) return;
    heartbeatBusyRef.current = true;
    try {
      const result = await heartbeatActivityLabBattery(sessionId);
      if (!mountedRef.current) return;
      if (!result.accepted) { sessionIdRef.current = null; displayStartedAtRef.current = null; setStatus("ready"); void refresh(); return; }
      applyServerValues(result.batterySeconds, result.bonusSeconds);
      setState((current) => current ? {
        ...current,
        batterySeconds: result.batterySeconds,
        bonusSeconds: result.bonusSeconds,
        totalPlayableSeconds: result.totalPlayableSeconds,
        isDraining: !result.depleted,
        activeSessionId: result.depleted ? null : current.activeSessionId,
        activeGameKey: result.depleted ? null : current.activeGameKey,
        activeStartedAt: result.depleted ? null : current.activeStartedAt,
        activeLastHeartbeatAt: result.depleted ? null : current.activeLastHeartbeatAt,
      } : current);
      if (result.depleted) {
        sessionIdRef.current = null; displayStartedAtRef.current = null; setStatus("ready");
        if (!depletedNotifiedRef.current) { depletedNotifiedRef.current = true; onDepletedRef.current?.(); }
      }
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : "Activity Lab battery heartbeat failed.");
    } finally { heartbeatBusyRef.current = false; }
  }, [applyServerValues, refresh]);

  useEffect(() => {
    if (!userId || !gameKey) return;
    if (shouldDrain) void startDrain(); else void stopDrain();
  }, [gameKey, shouldDrain, startDrain, stopDrain, userId]);

  useEffect(() => {
    if (status !== "draining" || !sessionIdRef.current) return;
    const interval = window.setInterval(() => { void heartbeat(); }, HEARTBEAT_MS);
    return () => window.clearInterval(interval);
  }, [heartbeat, status]);

  useEffect(() => {
    if (status !== "draining" || !sessionIdRef.current) return;
    const interval = window.setInterval(() => {
      const startedAt = displayStartedAtRef.current; if (!startedAt) return;
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const preview = drainPreview(displayStartBaseRef.current, displayStartBonusRef.current, elapsed);
      setDisplayBaseSeconds(preview.base); setDisplayBonusSeconds(preview.bonus);
    }, DISPLAY_TICK_MS);
    return () => window.clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (status !== "ready" || !state || state.isDraining) return;
    if (displayBaseSeconds >= state.capacitySeconds) return;
    if (!idleStartedAtRef.current) { idleStartedAtRef.current = Date.now(); idleStartBaseRef.current = displayBaseSeconds; }
    const interval = window.setInterval(() => {
      const startedAt = idleStartedAtRef.current; if (!startedAt) return;
      const elapsedRealSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const gained = Math.floor(elapsedRealSeconds / state.rechargeRealSecondsPerBatterySecond);
      setDisplayBaseSeconds(Math.min(state.capacitySeconds, idleStartBaseRef.current + gained));
    }, DISPLAY_TICK_MS);
    return () => window.clearInterval(interval);
  }, [displayBaseSeconds, state, status]);

  useEffect(() => {
    const stopOnPageHide = () => { void stopDrain(); };
    window.addEventListener("pagehide", stopOnPageHide);
    return () => window.removeEventListener("pagehide", stopOnPageHide);
  }, [stopDrain]);
  useEffect(() => () => { void stopDrain(); }, [stopDrain]);

  const remainingSeconds = displayBaseSeconds + displayBonusSeconds;
  const percentage = useMemo(() => {
    const capacity = state?.capacitySeconds ?? 0;
    if (capacity <= 0) return 0;
    return Math.max(0, Math.min(100, (displayBaseSeconds / capacity) * 100));
  }, [displayBaseSeconds, state?.capacitySeconds]);

  const fullRechargeAt = useMemo(() => {
    if (!state || status === "draining" || displayBaseSeconds >= state.capacitySeconds) return null;
    const missing = Math.max(0, state.capacitySeconds - displayBaseSeconds);
    return new Date(Date.now() + missing * state.rechargeRealSecondsPerBatterySecond * 1000);
  }, [displayBaseSeconds, state, status]);

  const nextBatteryMinuteAt = useMemo(() => {
    if (!state || status === "draining" || displayBaseSeconds >= state.capacitySeconds) return null;
    const remainder = displayBaseSeconds % 60;
    const secondsToNext = Math.min(remainder === 0 ? 60 : 60 - remainder, state.capacitySeconds - displayBaseSeconds);
    return new Date(Date.now() + secondsToNext * state.rechargeRealSecondsPerBatterySecond * 1000);
  }, [displayBaseSeconds, state, status]);

  return {
    state, status, error,
    remainingSeconds,
    baseBatterySeconds: displayBaseSeconds,
    bonusSeconds: displayBonusSeconds,
    capacitySeconds: state?.capacitySeconds ?? 0,
    percentage,
    isEmpty: remainingSeconds <= 0,
    isFull: Boolean(state && displayBaseSeconds >= state.capacitySeconds),
    isDraining: status === "draining",
    ownsDrainSession: Boolean(sessionIdRef.current),
    fullRechargeAt, nextBatteryMinuteAt,
    refresh, startDrain, stopDrain,
  };
}
