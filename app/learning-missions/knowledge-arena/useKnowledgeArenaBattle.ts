"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export type KnowledgeArenaBattleTopic =
  | "world_explorer"
  | "time_traveller"
  | "science_sparks";

export type KnowledgeArenaBattleMonster = {
  id: string;
  slug: string;
  name: string;
  topic: KnowledgeArenaBattleTopic;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  hp: number;
  attack_damage: number;
  attack_rating: number;
  defense_rating: number;
  sprite_url: string;
  collection_image_url: string;
};

export type KnowledgeArenaRouletteMonster = Pick<
  KnowledgeArenaBattleMonster,
  "id" | "slug" | "name" | "rarity" | "sprite_url"
>;

export type KnowledgeArenaEncounter = {
  battle_id: string | null;
  nova_hp: number;
  nova_attack_level?: number;
  monster: KnowledgeArenaBattleMonster;
  roulette: KnowledgeArenaRouletteMonster[];
};

export type CombatLogEntry = {
  question_id: string;
  shots_fired: number;
};

export type BattlePhase =
  | "idle"
  | "encounter"
  | "question"
  | "firing"
  | "monster_attack"
  | "hit"
  | "revive"
  | "monster_defeated"
  | "transition"
  | "defeat";

export type BattleResolution = {
  questionId: string;
  questionIndex: number;
  isCorrect: boolean;
  secondsUsed: number;
};

export type ReviveCurrency = "DT" | "DG";

export type ReviveResponse = {
  success: boolean;
  battle_id: string;
  revives_used: number;
  nova_hp: number;
  monster_hp: number;
  currency: ReviveCurrency;
  cost: number;
  transaction_id: string;
  token_balance: number | null;
  gem_balance: number | null;
};

const BASE_SHOT_DAMAGE = 12;
const SHOTS_PER_SECOND = 5;
const SHOT_INTERVAL_MS = 1000 / SHOTS_PER_SECOND;
const NOVA_START_HP = 1000;
const NOVA_REVIVE_HP = 500;

function defenseReduction(defenseRating: number) {
  const rating = Math.max(1, Math.min(5, Math.round(defenseRating || 1)));
  return (rating - 1) * 0.08;
}

function damagePerShot(defenseRating: number, attackLevel: number) {
  const safeLevel = Math.max(0, Math.min(10, Math.round(attackLevel || 0)));
  const upgradedBaseDamage = BASE_SHOT_DAMAGE * (1 + safeLevel * 0.05);
  return Math.max(
    1,
    Math.round(upgradedBaseDamage * (1 - defenseReduction(defenseRating))),
  );
}

export function fireWindowForSecondsUsed(secondsUsed: number) {
  if (secondsUsed <= 1) return 5;
  if (secondsUsed <= 3) return 4;
  if (secondsUsed <= 5) return 3;
  if (secondsUsed <= 7) return 2;
  return 1;
}

function wrongStreakMultiplier(streak: number) {
  if (streak <= 1) return 1;
  if (streak === 2) return 1.5;
  if (streak === 3) return 2;
  return 2.5;
}

export function useKnowledgeArenaBattle({
  userId,
  isPaused = false,
  onBattleTransitionComplete,
  onBattleDefeat,
}: {
  userId: string | null;
  isPaused?: boolean;
  onBattleTransitionComplete: () => void;
  onBattleDefeat: () => void;
}) {
  const [encounter, setEncounter] = useState<KnowledgeArenaEncounter | null>(null);
  const [phase, setPhase] = useState<BattlePhase>("idle");
  const [novaHp, setNovaHp] = useState(NOVA_START_HP);
  const [monsterHp, setMonsterHp] = useState(0);
  const [wrongStreak, setWrongStreak] = useState(0);
  const [maxWrongStreak, setMaxWrongStreak] = useState(0);
  const [revivesUsed, setRevivesUsed] = useState(0);
  const [fireWindowSeconds, setFireWindowSeconds] = useState(0);
  const [fireMsRemaining, setFireMsRemaining] = useState(0);
  const [shotsThisTurn, setShotsThisTurn] = useState(0);
  const [combatLog, setCombatLog] = useState<CombatLogEntry[]>([]);
  const [damageDealt, setDamageDealt] = useState(0);
  const [damageReceived, setDamageReceived] = useState(0);
  const [battleMessage, setBattleMessage] = useState("");
  const [damageFlash, setDamageFlash] = useState<number | null>(null);
  const [reviveError, setReviveError] = useState("");
  const [reviveWorking, setReviveWorking] = useState(false);
  const [currentResolution, setCurrentResolution] =
    useState<BattleResolution | null>(null);

  const fireHeldRef = useRef(false);
  const fireDeadlineRef = useRef(0);
  const pausedFireRemainingRef = useRef(0);
  const lastShotAtRef = useRef(0);
  const shotsRef = useRef(0);
  const combatLogRef = useRef<CombatLogEntry[]>([]);
  const encounterRef = useRef<KnowledgeArenaEncounter | null>(null);
  const monsterHpRef = useRef(0);
  const novaHpRef = useRef(NOVA_START_HP);
  const revivesUsedRef = useRef(0);
  const damageDealtRef = useRef(0);
  const damageReceivedRef = useRef(0);
  const maxWrongStreakRef = useRef(0);
  const phaseRef = useRef<BattlePhase>("idle");
  const pausedRef = useRef(isPaused);
  const currentResolutionRef = useRef<BattleResolution | null>(null);
  const completionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    monsterHpRef.current = monsterHp;
  }, [monsterHp]);

  useEffect(() => {
    novaHpRef.current = novaHp;
  }, [novaHp]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    pausedRef.current = isPaused;

    if (isPaused) {
      fireHeldRef.current = false;
      if (phaseRef.current === "firing" && fireDeadlineRef.current > 0) {
        pausedFireRemainingRef.current = Math.max(
          0,
          fireDeadlineRef.current - performance.now(),
        );
        setFireMsRemaining(pausedFireRemainingRef.current);
        fireDeadlineRef.current = 0;
      }
      return;
    }

    if (
      phaseRef.current === "firing" &&
      pausedFireRemainingRef.current > 0 &&
      fireDeadlineRef.current <= 0
    ) {
      fireDeadlineRef.current = performance.now() + pausedFireRemainingRef.current;
      pausedFireRemainingRef.current = 0;
    }
  }, [isPaused]);

  useEffect(() => {
    currentResolutionRef.current = currentResolution;
  }, [currentResolution]);

  const monster = encounter?.monster ?? null;
  const battleId = encounter?.battle_id ?? null;

  const monsterDamagePerShot = useMemo(
    () =>
      monster
        ? damagePerShot(monster.defense_rating, encounter?.nova_attack_level ?? 0)
        : BASE_SHOT_DAMAGE,
    [monster, encounter?.nova_attack_level],
  );

  const clearCompletionTimer = useCallback(() => {
    if (completionTimerRef.current !== null) {
      window.clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
  }, []);

  const resetBattle = useCallback(() => {
    clearCompletionTimer();
    fireHeldRef.current = false;
    fireDeadlineRef.current = 0;
    pausedFireRemainingRef.current = 0;
    lastShotAtRef.current = 0;
    shotsRef.current = 0;
    combatLogRef.current = [];
    encounterRef.current = null;
    monsterHpRef.current = 0;
    novaHpRef.current = NOVA_START_HP;
    revivesUsedRef.current = 0;
    damageDealtRef.current = 0;
    damageReceivedRef.current = 0;
    maxWrongStreakRef.current = 0;
    setEncounter(null);
    setPhase("idle");
    setNovaHp(NOVA_START_HP);
    setMonsterHp(0);
    setWrongStreak(0);
    setMaxWrongStreak(0);
    setRevivesUsed(0);
    setFireWindowSeconds(0);
    setFireMsRemaining(0);
    setShotsThisTurn(0);
    setCombatLog([]);
    setDamageDealt(0);
    setDamageReceived(0);
    setBattleMessage("");
    setDamageFlash(null);
    setReviveError("");
    setReviveWorking(false);
    setCurrentResolution(null);
  }, [clearCompletionTimer]);

  const prepareEncounter = useCallback(
    async (
      topic: KnowledgeArenaBattleTopic,
      challengeMode: string,
      timerSeconds: 10 | 20,
    ) => {
      resetBattle();
      setPhase("encounter");
      setBattleMessage("Scanning the arena for hostile lifeforms…");

      const { data, error } = await supabase.rpc(
        "get_knowledge_arena_encounter_v1",
        {
          p_topic: topic,
          p_challenge_mode: challengeMode,
          p_timer_seconds: timerSeconds,
        },
      );

      if (error || !data) {
        resetBattle();
        throw new Error(error?.message || "Nova could not locate an arena monster.");
      }

      const nextEncounter = data as KnowledgeArenaEncounter;
      encounterRef.current = nextEncounter;
      setEncounter(nextEncounter);
      setNovaHp(Number(nextEncounter.nova_hp || NOVA_START_HP));
      setMonsterHp(Number(nextEncounter.monster.hp || 0));
      novaHpRef.current = Number(nextEncounter.nova_hp || NOVA_START_HP);
      monsterHpRef.current = Number(nextEncounter.monster.hp || 0);
      setBattleMessage(`Encounter found: ${nextEncounter.monster.name}`);
      return nextEncounter;
    },
    [resetBattle],
  );

  const beginQuestion = useCallback(() => {
    if (phaseRef.current === "defeat" || phaseRef.current === "revive") return;
    setBattleMessage("");
    setDamageFlash(null);
    setShotsThisTurn(0);
    shotsRef.current = 0;
    lastShotAtRef.current = 0;
    setCurrentResolution(null);
    setPhase("question");
  }, []);

  const addCombatEntry = useCallback((entry: CombatLogEntry) => {
    const next = [
      ...combatLogRef.current.filter((item) => item.question_id !== entry.question_id),
      entry,
    ];
    combatLogRef.current = next;
    setCombatLog(next);
  }, []);

  const completeTurnSoon = useCallback(
    (delayMs: number) => {
      clearCompletionTimer();
      completionTimerRef.current = window.setTimeout(() => {
        completionTimerRef.current = null;
        onBattleTransitionComplete();
      }, delayMs);
    },
    [clearCompletionTimer, onBattleTransitionComplete],
  );

  const finishFiringTurn = useCallback(() => {
    const resolution = currentResolutionRef.current;
    if (!resolution) return;

    fireHeldRef.current = false;
    fireDeadlineRef.current = 0;
    pausedFireRemainingRef.current = 0;
    setFireMsRemaining(0);
    addCombatEntry({
      question_id: resolution.questionId,
      shots_fired: shotsRef.current,
    });

    if (monsterHpRef.current <= 0) {
      setPhase("monster_defeated");
      setBattleMessage("TARGET ELIMINATED");
      completeTurnSoon(1200);
      return;
    }

    setPhase("transition");
    setBattleMessage("Nova disengages. Next question incoming…");
    completeTurnSoon(650);
  }, [addCombatEntry, completeTurnSoon]);

  const fireOneShot = useCallback(() => {
    if (pausedRef.current || phaseRef.current !== "firing") return false;
    if (fireDeadlineRef.current <= 0 || performance.now() >= fireDeadlineRef.current) {
      return false;
    }

    const resolution = currentResolutionRef.current;
    if (!resolution) return false;

    const maxShots = fireWindowSeconds * SHOTS_PER_SECOND;
    if (shotsRef.current >= maxShots) return false;

    const now = performance.now();
    if (lastShotAtRef.current > 0 && now - lastShotAtRef.current < SHOT_INTERVAL_MS - 8) {
      return false;
    }
    lastShotAtRef.current = now;

    shotsRef.current += 1;
    setShotsThisTurn(shotsRef.current);

    // Once the real monster is defeated, later firing is target practice.
    if (monsterHpRef.current <= 0) return true;

    const nextHp = Math.max(0, monsterHpRef.current - monsterDamagePerShot);
    const actualDamage = monsterHpRef.current - nextHp;
    monsterHpRef.current = nextHp;
    setMonsterHp(nextHp);
    damageDealtRef.current += actualDamage;
    setDamageDealt(damageDealtRef.current);
    setDamageFlash(monsterDamagePerShot);
    window.setTimeout(() => setDamageFlash(null), 150);

    if (nextHp <= 0) {
      fireHeldRef.current = false;
      window.setTimeout(() => finishFiringTurn(), 80);
    }

    return true;
  }, [fireWindowSeconds, finishFiringTurn, monsterDamagePerShot]);

  useEffect(() => {
    if (phase !== "firing" || isPaused) return;

    const clock = window.setInterval(() => {
      if (fireDeadlineRef.current <= 0) return;
      const remaining = Math.max(0, fireDeadlineRef.current - performance.now());
      setFireMsRemaining(remaining);
      if (remaining <= 0) {
        window.clearInterval(clock);
        finishFiringTurn();
      }
    }, 50);

    return () => window.clearInterval(clock);
  }, [phase, isPaused, finishFiringTurn]);

  useEffect(() => {
    if (phase !== "firing" || isPaused) return;

    const fireTick = window.setInterval(() => {
      if (!fireHeldRef.current) return;
      fireOneShot();
    }, 40);

    return () => window.clearInterval(fireTick);
  }, [phase, isPaused, fireOneShot]);

  const startFiring = useCallback(() => {
    if (pausedRef.current || phaseRef.current !== "firing") return;

    // Tap/press only. Holding FIRE or Space must never sustain automatic fire.
    fireHeldRef.current = false;
    fireOneShot();
  }, [fireOneShot]);

  const stopFiring = useCallback(() => {
    fireHeldRef.current = false;
  }, []);

  useEffect(() => {
    function keyDown(event: KeyboardEvent) {
      if (event.code !== "Space" || phaseRef.current !== "firing") return;
      event.preventDefault();
      if (!event.repeat) startFiring();
    }

    function keyUp(event: KeyboardEvent) {
      if (event.code !== "Space") return;
      if (phaseRef.current === "firing") event.preventDefault();
      stopFiring();
    }

    function stopOnBlur() {
      stopFiring();
    }

    window.addEventListener("keydown", keyDown, { passive: false });
    window.addEventListener("keyup", keyUp, { passive: false });
    window.addEventListener("blur", stopOnBlur);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", stopOnBlur);
    };
  }, [startFiring, stopFiring]);

  const resolveAnswer = useCallback(
    (resolution: BattleResolution) => {
      if (!monster || pausedRef.current) return;

      clearCompletionTimer();
      setCurrentResolution(resolution);
      currentResolutionRef.current = resolution;
      setReviveError("");

      if (resolution.isCorrect) {
        setWrongStreak(0);
        setDamageFlash(null);
        setShotsThisTurn(0);
        shotsRef.current = 0;
        lastShotAtRef.current = 0;

        const fireSeconds = fireWindowForSecondsUsed(resolution.secondsUsed);
        setFireWindowSeconds(fireSeconds);
        setFireMsRemaining(fireSeconds * 1000);
        fireDeadlineRef.current = performance.now() + fireSeconds * 1000;
        pausedFireRemainingRef.current = 0;
        setPhase("firing");
        setBattleMessage(
          monsterHpRef.current > 0
            ? `CORRECT — FIRE! ${fireSeconds}s attack window`
            : `CORRECT — TARGET PRACTICE! ${fireSeconds}s`,
        );
        return;
      }

      addCombatEntry({ question_id: resolution.questionId, shots_fired: 0 });

      if (monsterHpRef.current <= 0) {
        setPhase("transition");
        setBattleMessage("The monster is already down. Next question incoming…");
        completeTurnSoon(700);
        return;
      }

      const nextWrongStreak = wrongStreak + 1;
      const multiplier = wrongStreakMultiplier(nextWrongStreak);
      const attackDamage = Math.round(monster.attack_damage * multiplier);
      setWrongStreak(nextWrongStreak);
      maxWrongStreakRef.current = Math.max(maxWrongStreakRef.current, nextWrongStreak);
      setMaxWrongStreak(maxWrongStreakRef.current);
      setPhase("monster_attack");
      setBattleMessage(
        nextWrongStreak > 1
          ? `WRONG STREAK ×${multiplier.toFixed(1)} — ${monster.name} attacks!`
          : `${monster.name} attacks!`,
      );

      completionTimerRef.current = window.setTimeout(() => {
        if (pausedRef.current) {
          // If the admin pauses during this short attack wind-up, wait until resumed.
          const waitForResume = window.setInterval(() => {
            if (pausedRef.current) return;
            window.clearInterval(waitForResume);
            const nextNovaHp = Math.max(0, novaHpRef.current - attackDamage);
            const actualDamage = novaHpRef.current - nextNovaHp;
            novaHpRef.current = nextNovaHp;
            setNovaHp(nextNovaHp);
            damageReceivedRef.current += actualDamage;
            setDamageReceived(damageReceivedRef.current);
            setDamageFlash(attackDamage);
            setPhase("hit");
            window.setTimeout(() => setDamageFlash(null), 300);

            if (nextNovaHp <= 0) {
              if (resolution.questionIndex < 9) {
                setPhase(userId && revivesUsed < 1 ? "revive" : "defeat");
                setBattleMessage("NOVA HAS FALLEN");
              } else {
                setBattleMessage("NOVA HAS FALLEN — final answer recorded");
                setPhase("transition");
                completeTurnSoon(900);
              }
              return;
            }

            setBattleMessage(`Nova takes ${attackDamage} damage.`);
            setPhase("transition");
            completeTurnSoon(900);
          }, 100);
          return;
        }

        const nextNovaHp = Math.max(0, novaHpRef.current - attackDamage);
        const actualDamage = novaHpRef.current - nextNovaHp;
        novaHpRef.current = nextNovaHp;
        setNovaHp(nextNovaHp);
        damageReceivedRef.current += actualDamage;
        setDamageReceived(damageReceivedRef.current);
        setDamageFlash(attackDamage);
        setPhase("hit");

        window.setTimeout(() => setDamageFlash(null), 300);

        if (nextNovaHp <= 0) {
          if (resolution.questionIndex < 9) {
            setPhase(userId && revivesUsed < 1 ? "revive" : "defeat");
            setBattleMessage("NOVA HAS FALLEN");
          } else {
            setBattleMessage("NOVA HAS FALLEN — final answer recorded");
            setPhase("transition");
            completeTurnSoon(900);
          }
          return;
        }

        setBattleMessage(`Nova takes ${attackDamage} damage.`);
        setPhase("transition");
        completeTurnSoon(900);
      }, 650);
    },
    [
      addCombatEntry,
      clearCompletionTimer,
      completeTurnSoon,
      monster,
      revivesUsed,
      userId,
      wrongStreak,
    ],
  );

  const revive = useCallback(
    async (
      currency: ReviveCurrency,
      answersSoFar: Array<{
        question_id: string;
        answer: string | null;
        seconds_used: number;
      }>,
    ) => {
      if (!battleId) throw new Error("This battle is not linked to an account.");
      if (phaseRef.current !== "revive") throw new Error("Nova is not awaiting revival.");
      if (pausedRef.current) throw new Error("Resume the battle before reviving Nova.");

      setReviveWorking(true);
      setReviveError("");

      const { data, error } = await supabase.rpc(
        "revive_knowledge_arena_battle_v1",
        {
          p_battle_id: battleId,
          p_currency: currency,
          p_answers: answersSoFar,
          p_combat_log: combatLogRef.current,
        },
      );

      setReviveWorking(false);

      if (error || !data) {
        const message = error?.message || "Nova could not be revived.";
        setReviveError(message);
        throw new Error(message);
      }

      const result = data as ReviveResponse;
      revivesUsedRef.current = 1;
      setRevivesUsed(1);
      setWrongStreak(0);
      setNovaHp(NOVA_REVIVE_HP);
      novaHpRef.current = NOVA_REVIVE_HP;
      setMonsterHp(Number(result.monster_hp));
      monsterHpRef.current = Number(result.monster_hp);
      setPhase("transition");
      setBattleMessage("NOVA REVIVED — 500 HP");

      window.dispatchEvent(new Event("dream-tokens-updated"));
      window.dispatchEvent(new Event("dream-gems-updated"));

      completeTurnSoon(900);
      return result;
    },
    [battleId, completeTurnSoon],
  );

  const acceptDefeat = useCallback(() => {
    if (phaseRef.current !== "defeat" && phaseRef.current !== "revive") return;
    if (pausedRef.current) return;
    clearCompletionTimer();
    setPhase("defeat");
    setBattleMessage("DEFEAT");
    onBattleDefeat();
  }, [clearCompletionTimer, onBattleDefeat]);

  const getSnapshot = useCallback(() => {
    const currentEncounter = encounterRef.current;
    return {
      battleId: currentEncounter?.battle_id ?? null,
      monster: currentEncounter?.monster ?? null,
      novaHp: novaHpRef.current,
      monsterHp: monsterHpRef.current,
      combatLog: [...combatLogRef.current],
      revivesUsed: revivesUsedRef.current,
      damageDealt: damageDealtRef.current,
      damageReceived: damageReceivedRef.current,
      maxWrongStreak: maxWrongStreakRef.current,
      phase: phaseRef.current,
    };
  }, []);

  const snapshot = useMemo(
    () => ({
      battleId,
      monster,
      novaHp,
      monsterHp,
      combatLog,
      revivesUsed,
      damageDealt,
      damageReceived,
      maxWrongStreak,
      phase,
    }),
    [
      battleId,
      combatLog,
      damageDealt,
      damageReceived,
      maxWrongStreak,
      monster,
      monsterHp,
      novaHp,
      phase,
      revivesUsed,
    ],
  );

  return {
    encounter,
    monster,
    battleId,
    phase,
    novaHp,
    monsterHp,
    wrongStreak,
    maxWrongStreak,
    revivesUsed,
    fireWindowSeconds,
    fireMsRemaining,
    shotsThisTurn,
    combatLog,
    damageDealt,
    damageReceived,
    battleMessage,
    damageFlash,
    reviveError,
    reviveWorking,
    monsterDamagePerShot,
    snapshot,
    getSnapshot,
    prepareEncounter,
    beginQuestion,
    resolveAnswer,
    startFiring,
    stopFiring,
    revive,
    acceptDefeat,
    resetBattle,
  };
}
