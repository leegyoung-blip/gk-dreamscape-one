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
  | "reviving"
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
const NOVA_START_HP = 1000;
const NOVA_REVIVE_HP = 500;

function defenseReduction(defenseRating: number) {
  const rating = Math.max(1, Math.min(5, Math.round(defenseRating || 1)));
  return (rating - 1) * 0.08;
}

function damagePerShot(defenseRating: number) {
  return Math.max(
    1,
    Math.round(BASE_SHOT_DAMAGE * (1 - defenseReduction(defenseRating))),
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
  onBattleTransitionComplete,
  onBattleDefeat,
}: {
  userId: string | null;
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
  const shotsRef = useRef(0);
  const combatLogRef = useRef<CombatLogEntry[]>([]);
  const monsterHpRef = useRef(0);
  const novaHpRef = useRef(NOVA_START_HP);
  const phaseRef = useRef<BattlePhase>("idle");
  const currentResolutionRef = useRef<BattleResolution | null>(null);
  const completionTimerRef = useRef<number | null>(null);

  // Keep the phase ref synchronous with React state so keyboard/pointer input
  // works immediately when a correct answer opens the firing window.
  const changePhase = useCallback((nextPhase: BattlePhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

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
    currentResolutionRef.current = currentResolution;
  }, [currentResolution]);

  const monster = encounter?.monster ?? null;
  const battleId = encounter?.battle_id ?? null;

  const monsterDamagePerShot = useMemo(
    () => (monster ? damagePerShot(monster.defense_rating) : BASE_SHOT_DAMAGE),
    [monster],
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
    shotsRef.current = 0;
    combatLogRef.current = [];
    monsterHpRef.current = 0;
    novaHpRef.current = NOVA_START_HP;
    setEncounter(null);
    changePhase("idle");
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
  }, [changePhase, clearCompletionTimer]);

  const prepareEncounter = useCallback(
    async (
      topic: KnowledgeArenaBattleTopic,
      challengeMode: string,
      timerSeconds: 10 | 20,
    ) => {
      resetBattle();
      changePhase("encounter");
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
      setEncounter(nextEncounter);
      setNovaHp(Number(nextEncounter.nova_hp || NOVA_START_HP));
      setMonsterHp(Number(nextEncounter.monster.hp || 0));
      novaHpRef.current = Number(nextEncounter.nova_hp || NOVA_START_HP);
      monsterHpRef.current = Number(nextEncounter.monster.hp || 0);
      setBattleMessage(`Encounter found: ${nextEncounter.monster.name}`);
      return nextEncounter;
    },
    [changePhase, resetBattle],
  );

  const beginQuestion = useCallback(() => {
    if (
      phaseRef.current === "defeat" ||
      phaseRef.current === "revive"
    ) return;
    setBattleMessage("");
    setDamageFlash(null);
    setShotsThisTurn(0);
    shotsRef.current = 0;
    setCurrentResolution(null);
    changePhase("question");
  }, [changePhase]);

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
    // The clock and a killing shot can finish on nearly the same frame.
    // Synchronously changing phase makes this idempotent.
    if (phaseRef.current !== "firing") return;

    const resolution = currentResolutionRef.current;
    if (!resolution) return;

    fireHeldRef.current = false;
    fireDeadlineRef.current = 0;
    setFireMsRemaining(0);
    addCombatEntry({
      question_id: resolution.questionId,
      shots_fired: shotsRef.current,
    });

    if (monsterHpRef.current <= 0) {
      changePhase("monster_defeated");
      setBattleMessage("TARGET ELIMINATED");
      completeTurnSoon(1200);
      return;
    }

    changePhase("transition");
    setBattleMessage("Nova disengages. Next question incoming…");
    completeTurnSoon(650);
  }, [addCombatEntry, completeTurnSoon, changePhase]);

  const fireOneShot = useCallback(() => {
    if (phaseRef.current !== "firing") return false;
    if (performance.now() >= fireDeadlineRef.current) return false;

    const resolution = currentResolutionRef.current;
    if (!resolution) return false;

    const maxShots = fireWindowSeconds * SHOTS_PER_SECOND;
    if (shotsRef.current >= maxShots) return false;

    shotsRef.current += 1;
    setShotsThisTurn(shotsRef.current);

    // Once the monster is defeated, later shots are harmless target practice.
    if (monsterHpRef.current <= 0) return true;

    const nextHp = Math.max(0, monsterHpRef.current - monsterDamagePerShot);
    const actualDamage = monsterHpRef.current - nextHp;
    monsterHpRef.current = nextHp;
    setMonsterHp(nextHp);
    setDamageDealt((current) => current + actualDamage);
    setDamageFlash(monsterDamagePerShot);
    window.setTimeout(() => setDamageFlash(null), 150);

    if (nextHp <= 0) {
      fireHeldRef.current = false;
      finishFiringTurn();
    }

    return true;
  }, [fireWindowSeconds, finishFiringTurn, monsterDamagePerShot]);

  useEffect(() => {
    if (phase !== "firing") return;

    const clock = window.setInterval(() => {
      const remaining = Math.max(0, fireDeadlineRef.current - performance.now());
      setFireMsRemaining(remaining);
      if (remaining <= 0) {
        window.clearInterval(clock);
        finishFiringTurn();
      }
    }, 50);

    return () => window.clearInterval(clock);
  }, [phase, finishFiringTurn]);

  useEffect(() => {
    if (phase !== "firing") return;

    const fireTick = window.setInterval(() => {
      if (!fireHeldRef.current) return;
      fireOneShot();
    }, 1000 / SHOTS_PER_SECOND);

    return () => window.clearInterval(fireTick);
  }, [phase, fireOneShot]);

  useEffect(() => {
    function isSpace(event: KeyboardEvent) {
      return event.code === "Space" || event.key === " ";
    }

    function keyDown(event: KeyboardEvent) {
      if (!isSpace(event) || phaseRef.current !== "firing") return;
      event.preventDefault();
      event.stopPropagation();

      // Register the first shot immediately. This avoids the old behaviour
      // where a quick press could end before the 200 ms autofire tick.
      if (!fireHeldRef.current && !event.repeat) {
        fireOneShot();
      }
      fireHeldRef.current = phaseRef.current === "firing";
    }

    function keyUp(event: KeyboardEvent) {
      if (!isSpace(event)) return;
      if (phaseRef.current === "firing") {
        event.preventDefault();
        event.stopPropagation();
      }
      fireHeldRef.current = false;
    }

    function stopOnBlur() {
      fireHeldRef.current = false;
    }

    // Capture at document level so Space works even if a previous answer
    // button still owns focus.
    document.addEventListener("keydown", keyDown, { capture: true, passive: false });
    document.addEventListener("keyup", keyUp, { capture: true, passive: false });
    window.addEventListener("blur", stopOnBlur);
    return () => {
      document.removeEventListener("keydown", keyDown, true);
      document.removeEventListener("keyup", keyUp, true);
      window.removeEventListener("blur", stopOnBlur);
      fireHeldRef.current = false;
    };
  }, [fireOneShot]);

  const startFiring = useCallback(() => {
    if (phaseRef.current !== "firing") return;

    // Pointer-down fires immediately, so a normal mouse click or quick tap
    // always counts as one shot. Keeping the pointer down enables autofire.
    if (!fireHeldRef.current) {
      fireOneShot();
    }
    fireHeldRef.current = phaseRef.current === "firing";
  }, [fireOneShot]);

  const stopFiring = useCallback(() => {
    fireHeldRef.current = false;
  }, []);

  const resolveAnswer = useCallback(
    (resolution: BattleResolution) => {
      if (!monster) return;

      clearCompletionTimer();
      setCurrentResolution(resolution);
      currentResolutionRef.current = resolution;
      setReviveError("");

      if (resolution.isCorrect) {
        setWrongStreak(0);
        setDamageFlash(null);
        setShotsThisTurn(0);
        shotsRef.current = 0;

        const fireSeconds = fireWindowForSecondsUsed(resolution.secondsUsed);
        setFireWindowSeconds(fireSeconds);
        setFireMsRemaining(fireSeconds * 1000);
        fireDeadlineRef.current = performance.now() + fireSeconds * 1000;
        changePhase("firing");
        setBattleMessage(
          monsterHpRef.current > 0
            ? `CORRECT — FIRE! ${fireSeconds}s attack window`
            : `CORRECT — TARGET PRACTICE! ${fireSeconds}s`,
        );
        return;
      }

      addCombatEntry({ question_id: resolution.questionId, shots_fired: 0 });

      if (monsterHpRef.current <= 0) {
        changePhase("transition");
        setBattleMessage("The monster is already down. Next question incoming…");
        completeTurnSoon(700);
        return;
      }

      const nextWrongStreak = wrongStreak + 1;
      const multiplier = wrongStreakMultiplier(nextWrongStreak);
      const attackDamage = Math.round(monster.attack_damage * multiplier);
      setWrongStreak(nextWrongStreak);
      setMaxWrongStreak((current) => Math.max(current, nextWrongStreak));
      changePhase("monster_attack");
      setBattleMessage(
        nextWrongStreak > 1
          ? `WRONG STREAK ×${multiplier.toFixed(1)} — ${monster.name} attacks!`
          : `${monster.name} attacks!`,
      );

      completionTimerRef.current = window.setTimeout(() => {
        const nextNovaHp = Math.max(0, novaHpRef.current - attackDamage);
        const actualDamage = novaHpRef.current - nextNovaHp;
        novaHpRef.current = nextNovaHp;
        setNovaHp(nextNovaHp);
        setDamageReceived((current) => current + actualDamage);
        setDamageFlash(attackDamage);
        changePhase("hit");

        window.setTimeout(() => setDamageFlash(null), 300);

        if (nextNovaHp <= 0) {
          if (resolution.questionIndex < 9) {
            changePhase(userId && revivesUsed < 1 ? "revive" : "defeat");
            setBattleMessage("NOVA HAS FALLEN");
          } else {
            setBattleMessage("NOVA HAS FALLEN — final answer recorded");
            changePhase("transition");
            completeTurnSoon(900);
          }
          return;
        }

        setBattleMessage(`Nova takes ${attackDamage} damage.`);
        changePhase("transition");
        completeTurnSoon(900);
      }, 650);
    },
    [
      addCombatEntry,
      changePhase,
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
      setRevivesUsed(1);
      setWrongStreak(0);
      setNovaHp(NOVA_REVIVE_HP);
      novaHpRef.current = NOVA_REVIVE_HP;
      setMonsterHp(Number(result.monster_hp));
      monsterHpRef.current = Number(result.monster_hp);
      changePhase("reviving");
      setBattleMessage("NOVA REVIVED — 500 HP");

      window.dispatchEvent(new Event("dream-tokens-updated"));
      window.dispatchEvent(new Event("dream-gems-updated"));

      completeTurnSoon(900);
      return result;
    },
    [battleId, changePhase, completeTurnSoon],
  );

  const acceptDefeat = useCallback(() => {
    if (phaseRef.current !== "defeat" && phaseRef.current !== "revive") return;
    clearCompletionTimer();
    changePhase("defeat");
    setBattleMessage("DEFEAT");
    onBattleDefeat();
  }, [changePhase, clearCompletionTimer, onBattleDefeat]);

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
