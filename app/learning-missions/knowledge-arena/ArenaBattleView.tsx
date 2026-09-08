"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, Ref } from "react";
import type {
  BattlePhase,
  KnowledgeArenaBattleMonster,
  KnowledgeArenaBattleTopic,
} from "./useKnowledgeArenaBattle";

type Answer = "A" | "B" | "C" | "D";

type Question = {
  id: string;
  question_text: string;
  question_image: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: Answer;
  explanation: string;
  difficulty: string;
};

const arenaBackgrounds: Record<KnowledgeArenaBattleTopic, string> = {
  world_explorer:
    "/activities/learning-missions/knowledge-arena/arenas/world-explorer-arena.png",
  time_traveller:
    "/activities/learning-missions/knowledge-arena/arenas/time-traveller-arena.png",
  science_sparks:
    "/activities/learning-missions/knowledge-arena/arenas/science-sparks-arena.png",
};

const novaSprites: Record<"idle" | "firing" | "hit" | "defeated", string> = {
  idle: "/activities/learning-missions/knowledge-arena/nova/nova-battle-idle.png",
  firing: "/activities/learning-missions/knowledge-arena/nova/nova-battle-firing.png",
  hit: "/activities/learning-missions/knowledge-arena/nova/nova-battle-hit.png",
  defeated: "/activities/learning-missions/knowledge-arena/nova/nova-battle-defeated.png",
};

type MonsterPose = "idle" | "defense" | "attack" | "hit" | "defeated";

const monsterPoseSprites: Record<string, Record<MonsterPose, string>> = {
  "atlas-golem": {
    idle: "/activities/learning-missions/knowledge-arena/monsters/atlas-golem/idle.png",
    defense: "/activities/learning-missions/knowledge-arena/monsters/atlas-golem/defense.png",
    attack: "/activities/learning-missions/knowledge-arena/monsters/atlas-golem/attack.png",
    hit: "/activities/learning-missions/knowledge-arena/monsters/atlas-golem/hit.png",
    defeated: "/activities/learning-missions/knowledge-arena/monsters/atlas-golem/defeated.png",
  },
  "tempest-roc": {
    idle: "/activities/learning-missions/knowledge-arena/monsters/tempest-roc/idle.png",
    defense: "/activities/learning-missions/knowledge-arena/monsters/tempest-roc/defense.png",
    attack: "/activities/learning-missions/knowledge-arena/monsters/tempest-roc/attack.png",
    hit: "/activities/learning-missions/knowledge-arena/monsters/tempest-roc/hit.png",
    defeated: "/activities/learning-missions/knowledge-arena/monsters/tempest-roc/defeated.png",
  },
  "worldbreaker-leviathan": {
    idle: "/activities/learning-missions/knowledge-arena/monsters/worldbreaker-leviathan/idle.png",
    defense: "/activities/learning-missions/knowledge-arena/monsters/worldbreaker-leviathan/defense.png",
    attack: "/activities/learning-missions/knowledge-arena/monsters/worldbreaker-leviathan/attack.png",
    hit: "/activities/learning-missions/knowledge-arena/monsters/worldbreaker-leviathan/hit.png",
    defeated: "/activities/learning-missions/knowledge-arena/monsters/worldbreaker-leviathan/defeated.png",
  },
  "verdant-sabertooth": {
    idle: "/activities/learning-missions/knowledge-arena/monsters/verdant-sabertooth/idle.png",
    defense: "/activities/learning-missions/knowledge-arena/monsters/verdant-sabertooth/defense.png",
    attack: "/activities/learning-missions/knowledge-arena/monsters/verdant-sabertooth/attack.png",
    hit: "/activities/learning-missions/knowledge-arena/monsters/verdant-sabertooth/hit.png",
    defeated: "/activities/learning-missions/knowledge-arena/monsters/verdant-sabertooth/defeated.png",
  },
};

function rarityLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function stars(value: number) {
  const rating = Math.max(1, Math.min(5, Math.round(value || 1)));
  return `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`;
}

function hpPercent(current: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (current / max) * 100));
}

function NovaSprite({ phase, imageRef }: { phase: BattlePhase; imageRef?: Ref<HTMLImageElement> }) {
  const key =
    phase === "firing"
      ? "firing"
      : phase === "monster_attack" || phase === "hit"
        ? "hit"
        : phase === "revive" || phase === "defeat"
          ? "defeated"
          : "idle";

  return (
    <div className={`kab-character kab-nova is-${key}`}>
      <div className="kab-character-fallback">NOVA</div>
      <img
        ref={imageRef}
        src={novaSprites[key]}
        alt="Nova"
        draggable={false}
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    </div>
  );
}

function MonsterSprite({
  monster,
  phase,
  monsterHp,
  damageFlash,
  imageRef,
}: {
  monster: KnowledgeArenaBattleMonster;
  phase: BattlePhase;
  monsterHp: number;
  damageFlash: number | null;
  imageRef?: Ref<HTMLImageElement>;
}) {
  const pose: MonsterPose =
    monsterHp <= 0 || phase === "monster_defeated"
      ? "defeated"
      : phase === "monster_attack"
        ? "attack"
        : phase === "firing" && damageFlash !== null
          ? "hit"
          : phase === "firing"
            ? "defense"
            : "idle";

  const sprite = monsterPoseSprites[monster.slug]?.[pose] || monster.sprite_url;

  return (
    <div className={`kab-character kab-monster is-${pose}`}>
      <div className="kab-character-fallback">{monster.name}</div>
      <img
        ref={imageRef}
        key={`${monster.slug}-${pose}`}
        src={sprite}
        alt={`${monster.name} ${pose}`}
        draggable={false}
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    </div>
  );
}

export function ArenaEncounterLoader({
  monster,
  roulette,
  revealIndex,
  locked,
}: {
  monster: KnowledgeArenaBattleMonster | null;
  roulette: Array<{ name: string; rarity: string; sprite_url: string }>;
  revealIndex: number;
  locked: boolean;
}) {
  const preview = roulette.length
    ? roulette[Math.max(0, revealIndex) % roulette.length]
    : null;

  const isLocked = Boolean(monster && locked);
  const shownName = isLocked && monster ? monster.name : preview?.name || "Scanning…";
  const shownRarity = isLocked && monster ? monster.rarity : preview?.rarity;
  const shownImage = isLocked && monster ? monster.sprite_url : preview?.sprite_url;

  return (
    <div className="kab-encounter-screen">
      <div className="kab-rng-ring">
        <div className="kab-rng-orbit kab-rng-orbit-a" />
        <div className="kab-rng-orbit kab-rng-orbit-b" />
        <div className="kab-rng-monster-preview">
          <div className="kab-rng-fallback">?</div>
          {shownImage && (
            <img
              src={shownImage}
              alt="Monster scan"
              draggable={false}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          )}
        </div>
      </div>

      <p className="kab-rng-kicker">MONSTER RNG</p>
      <h2>{isLocked ? "ENCOUNTER FOUND" : "SCANNING HOSTILES"}</h2>
      <strong className="kab-rng-name">{shownName}</strong>
      {shownRarity && <span className="kab-rng-rarity">{rarityLabel(shownRarity)}</span>}

      {isLocked && monster && (
        <div className="kab-rng-stats">
          <span>HP <strong>{monster.hp}</strong></span>
          <span>ATK <strong>{stars(monster.attack_rating)}</strong></span>
          <span>DEF <strong>{stars(monster.defense_rating)}</strong></span>
        </div>
      )}

      <style jsx>{`
        .kab-encounter-screen {
          display: flex;
          width: 100%;
          height: 100%;
          min-height: 0;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .kab-rng-ring {
          position: relative;
          display: grid;
          width: clamp(150px, 24vh, 230px);
          aspect-ratio: 1;
          place-items: center;
        }
        .kab-rng-orbit {
          position: absolute;
          inset: 6%;
          border: 1px solid rgba(126,232,255,.28);
          border-radius: 50%;
          box-shadow: 0 0 34px rgba(83,215,255,.12);
          animation: kabOrbit 1.05s linear infinite;
        }
        .kab-rng-orbit-b {
          inset: 17%;
          border-color: rgba(201,168,255,.3);
          animation-direction: reverse;
          animation-duration: .76s;
        }
        .kab-rng-orbit::before,
        .kab-rng-orbit::after {
          position: absolute;
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: #7ee8ff;
          box-shadow: 0 0 14px rgba(126,232,255,.85);
          content: "";
        }
        .kab-rng-orbit::before { top: -5px; left: 50%; }
        .kab-rng-orbit::after { bottom: -5px; right: 24%; }
        .kab-rng-monster-preview {
          position: relative;
          display: grid;
          width: 62%;
          aspect-ratio: 1;
          place-items: center;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 44% 56% 48% 52%;
          background: radial-gradient(circle at 40% 30%,rgba(126,232,255,.2),rgba(76,29,149,.16) 48%,rgba(2,8,19,.86));
        }
        .kab-rng-monster-preview img {
          position: relative;
          z-index: 2;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .kab-rng-fallback {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          color: rgba(255,255,255,.28);
          font-size: 54px;
          font-weight: 950;
        }
        .kab-rng-kicker {
          margin: 8px 0 0;
          color: #7ee8ff;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: .18em;
        }
        .kab-encounter-screen h2 {
          margin: 6px 0 0;
          font-size: clamp(24px,3vw,38px);
          letter-spacing: -.03em;
        }
        .kab-rng-name {
          margin-top: 7px;
          font-size: clamp(18px,2.2vw,29px);
        }
        .kab-rng-rarity {
          margin-top: 5px;
          color: #c9a8ff;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .12em;
          text-transform: uppercase;
        }
        .kab-rng-stats {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 6px;
          margin-top: 12px;
        }
        .kab-rng-stats span {
          border: 1px solid rgba(126,232,255,.15);
          border-radius: 999px;
          background: rgba(255,255,255,.045);
          padding: 6px 9px;
          color: rgba(255,255,255,.52);
          font-size: 8px;
          font-weight: 850;
        }
        .kab-rng-stats strong { color: white; }
        @keyframes kabOrbit { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

type ShotVisual = {
  id: number;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
  endX: number;
  endY: number;
  angle: number;
};

// Exact barrel calibration for nova-battle-firing.png.
// Source asset: 1122 × 1402 px. The centre of the visible muzzle opening
// is at approximately pixel (898, 376). Keeping this as a normalized
// hotspot means it remains aligned after responsive scaling/object-fit.
const NOVA_FIRING_BARREL_HOTSPOT = {
  x: 898 / 1122,
  y: 376 / 1402,
} as const;

const MONSTER_IMPACT_HOTSPOTS: Record<string, { x: number; y: number }> = {
  "atlas-golem": { x: 0.36, y: 0.46 },
  "tempest-roc": { x: 0.42, y: 0.46 },
  "worldbreaker-leviathan": { x: 0.30, y: 0.46 },
  "verdant-sabertooth": { x: 0.34, y: 0.46 },
};

function imageHotspot(
  image: HTMLImageElement,
  hotspot: { x: number; y: number },
) {
  const rect = containedImageRect(image);
  return {
    x: rect.left + rect.width * hotspot.x,
    y: rect.top + rect.height * hotspot.y,
  };
}

function containedImageRect(image: HTMLImageElement) {
  const box = image.getBoundingClientRect();
  const naturalWidth = image.naturalWidth || box.width || 1;
  const naturalHeight = image.naturalHeight || box.height || 1;
  const scale = Math.min(box.width / naturalWidth, box.height / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  return {
    left: box.left + (box.width - width) / 2,
    top: box.top + (box.height - height) / 2,
    width,
    height,
  };
}



export function ArenaBattleView({
  topic,
  topicTitle,
  challengeLabel,
  question,
  questionIndex,
  score,
  correctCount,
  timeLeft,
  timerSeconds,
  answerLocked,
  selectedAnswer,
  feedback,
  getAnswerStyle,
  onChoose,
  monster,
  phase,
  novaHp,
  monsterHp,
  wrongStreak,
  fireMsRemaining,
  shotsThisTurn,
  battleMessage,
  damageFlash,
  revivesUsed,
  reviveWorking,
  reviveError,
  tokenBalance,
  gemBalance,
  isAuthenticated,
  isAdmin,
  isPaused,
  onTogglePause,
  onStartFiring,
  onStopFiring,
  onReviveDT,
  onReviveDG,
  onAcceptDefeat,
}: {
  topic: KnowledgeArenaBattleTopic;
  topicTitle: string;
  challengeLabel: string;
  question: Question;
  questionIndex: number;
  score: number;
  correctCount: number;
  timeLeft: number;
  timerSeconds: 10 | 20;
  answerLocked: boolean;
  selectedAnswer: Answer | null;
  feedback: string | null;
  getAnswerStyle: (answer: Answer) => CSSProperties;
  onChoose: (answer: Answer) => void;
  monster: KnowledgeArenaBattleMonster;
  phase: BattlePhase;
  novaHp: number;
  monsterHp: number;
  wrongStreak: number;
  fireMsRemaining: number;
  shotsThisTurn: number;
  battleMessage: string;
  damageFlash: number | null;
  revivesUsed: number;
  reviveWorking: boolean;
  reviveError: string;
  tokenBalance: number;
  gemBalance: number;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isPaused: boolean;
  onTogglePause: () => void;
  onStartFiring: () => void;
  onStopFiring: () => void;
  onReviveDT: () => void;
  onReviveDG: () => void;
  onAcceptDefeat: () => void;
}) {
  const options: [Answer, string][] = [
    ["A", question.option_a],
    ["B", question.option_b],
    ["C", question.option_c],
    ["D", question.option_d],
  ];

  const stageRef = useRef<HTMLDivElement | null>(null);
  const novaImageRef = useRef<HTMLImageElement | null>(null);
  const monsterImageRef = useRef<HTMLImageElement | null>(null);
  const muzzleAnchorRef = useRef<HTMLSpanElement | null>(null);
  const impactAnchorRef = useRef<HTMLSpanElement | null>(null);
  const lastVisualShotRef = useRef(0);
  const [projectiles, setProjectiles] = useState<ShotVisual[]>([]);
  const [damagePopups, setDamagePopups] = useState<
    Array<{ id: number; target: "nova" | "monster"; value: number }>
  >([]);

  useEffect(() => {
    if (phase !== "firing" || shotsThisTurn <= lastVisualShotRef.current) {
      if (phase !== "firing") {
        lastVisualShotRef.current = 0;
        setProjectiles([]);
      }
      return;
    }

    const stage = stageRef.current;
    const muzzle = muzzleAnchorRef.current;
    const impact = impactAnchorRef.current;
    const novaImage = novaImageRef.current;
    const monsterImage = monsterImageRef.current;
    if (!stage || !muzzle || !impact || !novaImage || !monsterImage) return;

    const stageBox = stage.getBoundingClientRect();
    const muzzleBox = muzzle.getBoundingClientRect();
    const impactBox = impact.getBoundingClientRect();

    for (let shot = lastVisualShotRef.current + 1; shot <= shotsThisTurn; shot += 1) {
      const startX = muzzleBox.left - stageBox.left + muzzleBox.width / 2;
      const startY = muzzleBox.top - stageBox.top + muzzleBox.height / 2;
      const endX = impactBox.left - stageBox.left + impactBox.width / 2;
      const endY = impactBox.top - stageBox.top + impactBox.height / 2;
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
      const visual = {
        id: Date.now() + shot,
        startX,
        startY,
        deltaX,
        deltaY,
        endX,
        endY,
        angle,
      };
      setProjectiles((current) => [...current, visual]);
      window.setTimeout(() => {
        setProjectiles((current) => current.filter((item) => item.id !== visual.id));
      }, 620);
    }

    lastVisualShotRef.current = shotsThisTurn;
  }, [shotsThisTurn, phase, monster.slug]);

  useEffect(() => {
    if (damageFlash === null) return;
    const target: "nova" | "monster" = phase === "firing" || phase === "monster_defeated" ? "monster" : "nova";
    const id = Date.now() + Math.random();
    setDamagePopups((current) => [...current, { id, target, value: damageFlash }]);
    window.setTimeout(() => {
      setDamagePopups((current) => current.filter((item) => item.id !== id));
    }, 1500);
  }, [damageFlash, phase]);

  const correct = selectedAnswer !== null && selectedAnswer === question.correct_answer;
  const fireSecondsLeft = Math.max(0, fireMsRemaining / 1000);
  const monsterDefeated = monsterHp <= 0;

  return (
    <div
      ref={stageRef}
      className="kab-stage kab-stage-v3"
      style={{ backgroundImage: `url("${arenaBackgrounds[topic]}")` }}
    >
      <div className="kab-vignette" />

      <div className="kab-top-strip">
        <div className="kab-top-left">
          <span className="kab-chip">Q {questionIndex + 1}/10</span>
          <span className="kab-chip">Score {score}</span>
          <span className="kab-chip kab-chip--hide-mobile">Correct {correctCount}</span>
        </div>
        <div className="kab-top-right">
          {isAdmin && (
            <button
              type="button"
              className={`kab-chip kab-chip-button ${isPaused ? "is-paused" : ""}`}
              onClick={onTogglePause}
            >
              {isPaused ? "▶ Resume" : "Ⅱ Pause"}
            </button>
          )}
          <span className={`kab-chip kab-timer-chip ${timeLeft <= 3 ? "is-low" : ""}`}>{timeLeft}s</span>
        </div>
      </div>

      <div className="kab-overlay-top">
        <div className="kab-question-panel">
          <div className="kab-question-card">
            <small>{timerSeconds}s timer</small>
            <h2>{question.question_text}</h2>
            {question.question_image && (
              <img
                src={question.question_image}
                alt={`Question ${questionIndex + 1}`}
                draggable={false}
                className="kab-question-image"
              />
            )}
          </div>
          {feedback && answerLocked && (
            <div className={`kab-feedback ${correct ? "is-correct" : "is-wrong"}`}>
              {feedback}
              {wrongStreak > 1 && !correct && monsterHp > 0 && (
                <strong> Wrong streak: {wrongStreak}</strong>
              )}
            </div>
          )}
        </div>

        <div className="kab-right-panel">
          <div className="kab-answer-grid kab-answer-grid--top">
            {options.map(([label, optionText]) => (
              <button
                key={label}
                type="button"
                disabled={answerLocked || isPaused}
                onClick={() => onChoose(label)}
                className="kab-answer"
                style={getAnswerStyle(label)}
              >
                <strong>{label}</strong>
                <span>{optionText}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="kab-battle-center">
        <div className="kab-fighter kab-fighter-left">
          <NovaSprite phase={phase} imageRef={novaImageRef} />
          <span ref={muzzleAnchorRef} className="kab-muzzle-anchor" aria-hidden="true" />
          {damagePopups
            .filter((item) => item.target === "nova")
            .map((item) => (
              <div key={item.id} className="kab-damage-float kab-damage-float--nova">-{item.value}</div>
            ))}
        </div>

        <div className="kab-center-status">
          {battleMessage && <div className="kab-battle-message">{battleMessage}</div>}
          {phase === "firing" && (
            <div className="kab-fire-panel">
              <strong>{monsterDefeated ? "TARGET PRACTICE" : "FIRE!"}</strong>
              <span>{fireSecondsLeft.toFixed(1)}s</span>
              <small>{shotsThisTurn} shots</small>
            </div>
          )}
          {phase === "monster_defeated" && (
            <div className="kab-target-eliminated">TARGET ELIMINATED</div>
          )}
        </div>

        <div className="kab-fighter kab-fighter-right">
          <MonsterSprite
            monster={monster}
            phase={phase}
            monsterHp={monsterHp}
            damageFlash={damageFlash}
            imageRef={monsterImageRef}
          />
          <span ref={impactAnchorRef} className={`kab-impact-anchor kab-impact-anchor--${monster.slug}`} aria-hidden="true" />
          {damagePopups
            .filter((item) => item.target === "monster")
            .map((item) => (
              <div key={item.id} className="kab-damage-float kab-damage-float--monster">-{item.value}</div>
            ))}
        </div>

        {projectiles.map((shot) => (
          <div key={shot.id} className="kab-shot-layer" aria-hidden="true">
            <i className="kab-shot-muzzle" style={{ left: shot.startX, top: shot.startY }} />
            <span
              className="kab-blaster-bolt"
              style={{
                left: shot.startX,
                top: shot.startY,
                "--shot-x": `${shot.deltaX}px`,
                "--shot-y": `${shot.deltaY}px`,
                "--shot-angle": `${shot.angle}deg`,
              } as CSSProperties}
            />
            <i className="kab-shot-impact" style={{ left: shot.endX, top: shot.endY }}>
              <b />
              <b />
              <b />
            </i>
          </div>
        ))}
      </div>

      <div className="kab-bottom-hud">
        <div className="kab-hp-card kab-bottom-card">
          <div className="kab-hp-title">
            <strong>NOVA</strong>
            <span>{novaHp} / 1000 HP</span>
          </div>
          <div className="kab-hp-track">
            <i style={{ width: `${hpPercent(novaHp, 1000)}%` }} />
          </div>
        </div>

        <button
          type="button"
          className={`kab-floating-fire ${phase === "firing" && !isPaused ? "is-ready" : "is-idle"}`}
          disabled={phase !== "firing" || isPaused}
          aria-label={phase === "firing" ? "Fire Nova's blaster" : "Fire becomes available after a correct answer"}
          onClick={() => {
            onStartFiring();
            onStopFiring();
          }}
        >
          <span>FIRE</span>
          <small>{phase === "firing" ? `${fireSecondsLeft.toFixed(1)}s` : "TAP"}</small>
        </button>

        <div className="kab-hp-card kab-bottom-card kab-monster-card">
          <div className="kab-hp-title">
            <strong>{monster.name}</strong>
            <span>{monsterHp} / {monster.hp} HP</span>
          </div>
          <div className="kab-hp-track kab-monster-hp">
            <i style={{ width: `${hpPercent(monsterHp, monster.hp)}%` }} />
          </div>
          <div className="kab-monster-stats">
            <span>{rarityLabel(monster.rarity)}</span>
            <span>ATK {stars(monster.attack_rating)}</span>
            <span>DEF {stars(monster.defense_rating)}</span>
          </div>
        </div>
      </div>

      {isPaused && (
        <div className="kab-pause-layer">
          <div className="kab-pause-card">
            <small>ADMIN CONTROL</small>
            <strong>Battle Paused</strong>
            <span>Question and blaster timers are frozen.</span>
            <button type="button" onClick={onTogglePause}>Resume Battle</button>
          </div>
        </div>
      )}

      {(phase === "revive" || phase === "defeat") && (
        <div className="kab-defeat-layer">
          <div className="kab-defeat-card">
            <p>{phase === "revive" ? "NOVA HAS FALLEN" : "DEFEAT"}</p>
            <h2>{phase === "revive" ? "Revive Nova?" : "The battle is over."}</h2>
            {phase === "revive" && (
              <>
                <span>One revive maximum · restores Nova to 500 HP</span>
                <div className="kab-revive-grid">
                  <button
                    type="button"
                    disabled={isPaused || reviveWorking || !isAuthenticated || tokenBalance < 10}
                    onClick={onReviveDT}
                  >
                    <strong>REVIVE · 10 DT</strong>
                    <small>Balance {tokenBalance} DT</small>
                  </button>
                  <button
                    type="button"
                    disabled={isPaused || reviveWorking || !isAuthenticated || gemBalance < 1}
                    onClick={onReviveDG}
                  >
                    <strong>REVIVE · 1 DG</strong>
                    <small>Balance {gemBalance} DG</small>
                  </button>
                </div>
              </>
            )}

            {reviveError && <div className="kab-revive-error">{reviveError}</div>}

            <button
              type="button"
              className="kab-accept-defeat"
              disabled={isPaused || reviveWorking}
              onClick={onAcceptDefeat}
            >
              ACCEPT DEFEAT
            </button>

            {revivesUsed > 0 && phase === "defeat" && (
              <small>Your one revive was already used in this battle.</small>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .kab-stage {
          position: relative;
          display: grid;
          grid-template-rows: auto auto minmax(0, 1fr) auto;
          width: 100%;
          height: 100%;
          min-height: 0;
          overflow: hidden;
          border: 1px solid rgba(126, 232, 255, 0.18);
          border-radius: 18px;
          background-position: center;
          background-size: cover;
          color: white;
          isolation: isolate;
        }
        .kab-vignette {
          position: absolute;
          inset: 0;
          z-index: -1;
          background:
            linear-gradient(180deg, rgba(1, 5, 15, 0.30), rgba(1, 5, 15, 0.06) 34%, rgba(1, 5, 15, 0.42)),
            radial-gradient(circle at 50% 68%, transparent 0 28%, rgba(0, 0, 0, 0.14) 82%);
        }
        .kab-top-strip {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 10px 14px 0;
        }
        .kab-top-left,
        .kab-top-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .kab-chip {
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 999px;
          background: rgba(5,10,24,.68);
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 800;
          backdrop-filter: blur(6px);
        }
        .kab-chip-button { color: white; }
        .kab-timer-chip.is-low { color: #ff8d8d; }
        .kab-overlay-top {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(340px, 0.92fr);
          gap: 14px;
          padding: 10px 14px 0;
          align-items: start;
        }
        .kab-question-panel, .kab-right-panel { min-width: 0; }
        .kab-question-panel { display: grid; gap: 10px; }
        .kab-question-card {
          border: 1px solid rgba(126,232,255,.18);
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(4, 13, 29, .88), rgba(6, 18, 38, .75));
          padding: 16px;
          backdrop-filter: blur(8px);
        }
        .kab-question-card small {
          display: block;
          color: #7ee8ff;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .12em;
          text-transform: uppercase;
        }
        .kab-question-card h2 {
          margin: 8px 0 0;
          font-size: clamp(20px, 2vw, 34px);
          line-height: 1.16;
        }
        .kab-question-image {
          margin-top: 10px;
          max-width: 100%;
          max-height: 110px;
          object-fit: contain;
          border-radius: 12px;
        }
        .kab-right-panel { display: grid; gap: 10px; }
        .kab-answer-grid--top {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .kab-answer {
          min-height: 86px;
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 12px;
          align-items: center;
          border-radius: 18px;
          padding: 14px 16px;
          text-align: left;
          backdrop-filter: blur(6px);
        }
        .kab-answer strong {
          display: grid;
          width: 34px;
          height: 34px;
          place-items: center;
          border-radius: 999px;
          background: rgba(255,255,255,.12);
          font-size: 16px;
        }
        .kab-answer span {
          font-size: clamp(16px, 1.35vw, 20px);
          line-height: 1.25;
          font-weight: 800;
        }
        .kab-feedback {
          border-radius: 14px;
          padding: 10px 12px;
          font-size: 14px;
          font-weight: 800;
          background: rgba(8,12,26,.76);
        }
        .kab-feedback.is-correct { border: 1px solid rgba(75, 255, 171, .35); }
        .kab-feedback.is-wrong { border: 1px solid rgba(255, 102, 130, .35); }
        .kab-battle-center {
          position: relative;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: clamp(50px, 9vw, 120px);
          padding: 2px 40px 0;
          min-height: 0;
        }
        .kab-fighter {
          position: relative;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          width: min(22vw, 270px);
          height: min(36vh, 310px);
        }
        .kab-fighter-left { transform: translateY(-14px); }
        .kab-fighter-right { transform: translateY(-6px); }
        .kab-character,
        .kab-character img {
          width: 100%;
          height: 100%;
        }
        .kab-character {
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .kab-character img {
          object-fit: contain;
          object-position: center bottom;
          filter: drop-shadow(0 12px 24px rgba(0,0,0,.28));
        }
        .kab-character-fallback { display: none; }
        .kab-center-status {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          align-self: center;
          margin-top: 8px;
        }
        .kab-battle-message,
        .kab-fire-panel,
        .kab-target-eliminated {
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 16px;
          background: rgba(6, 11, 25, .78);
          padding: 10px 14px;
          text-align: center;
          backdrop-filter: blur(8px);
        }
        .kab-fire-panel { display: grid; gap: 3px; }
        .kab-muzzle-anchor,
        .kab-impact-anchor {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 999px;
          opacity: 0;
          pointer-events: none;
        }
        /* Calibrated against the actual combat layout rather than the img box. */
        .kab-muzzle-anchor {
          left: 67.2%;
          top: 24.8%;
        }
        .kab-impact-anchor--atlas-golem { left: 29%; top: 34%; }
        .kab-impact-anchor--tempest-roc { left: 38%; top: 36%; }
        .kab-impact-anchor--worldbreaker-leviathan { left: 26%; top: 44%; }
        .kab-impact-anchor--verdant-sabertooth { left: 31%; top: 45%; }
        .kab-shot-layer {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .kab-shot-muzzle {
          position: absolute;
          width: 10px;
          height: 10px;
          margin-left: -5px;
          margin-top: -5px;
          border-radius: 999px;
          background: radial-gradient(circle, #ffffff 0 16%, #ffc6a0 44%, rgba(255,120,54,.12) 74%, transparent 76%);
          animation: kabMuzzle .18s ease-out forwards;
        }
        .kab-blaster-bolt {
          position: absolute;
          width: 18px;
          height: 8px;
          margin-left: -9px;
          margin-top: -4px;
          border-radius: 999px;
          background: linear-gradient(90deg, #ffe3d6 0%, #ff7156 18%, #ff3030 58%, #b60000 100%);
          box-shadow: 0 0 8px rgba(255,84,66,.95), 0 0 16px rgba(255,84,66,.35);
          transform: translate3d(0,0,0) rotate(var(--shot-angle));
          transform-origin: center;
          animation: kabBolt .20s linear forwards;
        }
        .kab-shot-impact {
          position: absolute;
          width: 18px;
          height: 18px;
          margin-left: -9px;
          margin-top: -9px;
          border-radius: 999px;
          opacity: 0;
          animation: kabImpact .32s ease-out .16s forwards;
        }
        .kab-shot-impact b {
          position: absolute;
          inset: 0;
          border: 2px solid rgba(255,132,102,.95);
          border-radius: 999px;
        }
        .kab-shot-impact b:nth-child(2) { transform: scale(1.45); opacity: .58; }
        .kab-shot-impact b:nth-child(3) { transform: scale(2.02); opacity: .28; }
        .kab-damage-float {
          position: absolute;
          top: 18%;
          padding: 5px 9px;
          border-radius: 999px;
          background: rgba(160,0,0,.55);
          color: #ff8f8f;
          font-size: 28px;
          font-weight: 950;
          text-shadow: 0 0 8px rgba(0,0,0,.45);
          animation: kabDamageFloat 1.5s ease-out forwards;
          pointer-events: none;
        }
        .kab-damage-float--nova { right: 10%; }
        .kab-damage-float--monster { left: 9%; }
        .kab-bottom-hud {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0,1fr) auto minmax(0,1fr);
          gap: 14px;
          padding: 0 14px 14px;
          align-items: end;
        }
        .kab-hp-card {
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 16px;
          background: rgba(6, 11, 25, .84);
          padding: 10px 12px;
          backdrop-filter: blur(8px);
        }
        .kab-hp-title {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 800;
        }
        .kab-hp-track {
          height: 14px;
          border-radius: 999px;
          background: rgba(255,255,255,.08);
          overflow: hidden;
        }
        .kab-hp-track i {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #3ad991, #a8ffcf);
        }
        .kab-monster-hp i {
          background: linear-gradient(90deg, #ff9d29, #ffd257);
        }
        .kab-monster-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 12px;
          margin-top: 8px;
          color: rgba(255,255,255,.72);
          font-size: 12px;
          font-weight: 800;
        }
        .kab-floating-fire {
          z-index: 5;
          display: grid;
          width: 92px;
          height: 92px;
          place-items: center;
          border: 1px solid rgba(255,145,145,.45);
          border-radius: 999px;
          background: radial-gradient(circle at 35% 30%, rgba(255, 175, 175, .95), rgba(220, 22, 22, .94));
          color: white;
          font-weight: 950;
          box-shadow: 0 12px 28px rgba(220,22,22,.34);
        }
        .kab-floating-fire:disabled { opacity: .45; }
        .kab-floating-fire span { font-size: 20px; letter-spacing: .08em; }
        .kab-floating-fire small { font-size: 11px; letter-spacing: .14em; }
        .kab-pause-layer,
        .kab-defeat-layer {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 24px;
          background: rgba(2, 5, 15, .62);
          backdrop-filter: blur(8px);
          z-index: 8;
        }
        .kab-pause-card,
        .kab-defeat-card {
          width: min(520px, 100%);
          display: grid;
          gap: 10px;
          border: 1px solid rgba(126,232,255,.22);
          border-radius: 20px;
          background: linear-gradient(180deg, rgba(5, 14, 29, .95), rgba(6, 11, 24, .92));
          padding: 20px;
          text-align: center;
        }
        .kab-pause-card button,
        .kab-accept-defeat,
        .kab-revive-grid button {
          border: 1px solid rgba(126,232,255,.22);
          border-radius: 14px;
          background: rgba(126,232,255,.12);
          color: white;
          padding: 12px 14px;
          font-weight: 900;
        }
        .kab-revive-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        @keyframes kabBolt {
          from { transform: translate3d(0,0,0) scale(.85) rotate(var(--shot-angle)); }
          to { transform: translate3d(var(--shot-x), var(--shot-y), 0) scale(1.05) rotate(var(--shot-angle)); }
        }
        @keyframes kabImpact {
          0% { opacity: 0; transform: scale(.35); }
          25% { opacity: 1; }
          100% { opacity: 0; transform: scale(2.35); }
        }
        @keyframes kabMuzzle {
          from { opacity: 1; transform: scale(.4); }
          to { opacity: 0; transform: scale(2.1); }
        }
        @keyframes kabDamageFloat {
          0% { opacity: 0; transform: translateY(14px) scale(.8); }
          12% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-42px) scale(1.05); }
        }
        @media (max-width: 1100px) {
          .kab-overlay-top { grid-template-columns: 1fr 1fr; }
          .kab-fighter { width: min(20vw, 220px); height: min(28vh, 220px); }
          .kab-bottom-hud { gap: 10px; }
          .kab-floating-fire { width: 82px; height: 82px; }
        }
        @media (max-width: 850px) {
          .kab-top-strip { padding: 8px 10px 0; }
          .kab-chip { padding: 6px 10px; font-size: 11px; }
          .kab-chip--hide-mobile { display: none; }
          .kab-overlay-top {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            padding: 8px 10px 0;
          }
          .kab-question-card { padding: 12px; }
          .kab-question-card h2 { font-size: clamp(14px, 2.9vw, 20px); }
          .kab-question-card small { font-size: 10px; }
          .kab-answer { min-height: 62px; padding: 8px 10px; border-radius: 14px; }
          .kab-answer strong { width: 28px; height: 28px; font-size: 13px; }
          .kab-answer span { font-size: 13px; }
          .kab-feedback { font-size: 12px; padding: 8px 10px; }
          .kab-battle-center {
            gap: 18px;
            padding: 0 12px 0;
          }
          .kab-fighter {
            width: min(18vw, 110px);
            height: min(20vh, 110px);
          }
          .kab-fighter-left { transform: translateY(-4px); }
          .kab-fighter-right { transform: translateY(0); }
          .kab-muzzle-anchor { left: 67.5%; top: 25%; }
          .kab-center-status { gap: 6px; margin-top: 0; }
          .kab-battle-message, .kab-fire-panel, .kab-target-eliminated { padding: 8px 10px; font-size: 11px; }
          .kab-damage-float { font-size: 16px; top: 10%; }
          .kab-bottom-hud {
            grid-template-columns: minmax(0,1fr) auto minmax(0,1fr);
            gap: 8px;
            padding: 0 10px 10px;
          }
          .kab-hp-card { padding: 8px 8px; border-radius: 12px; }
          .kab-hp-title { font-size: 10px; margin-bottom: 6px; }
          .kab-hp-track { height: 8px; }
          .kab-monster-stats { display: none; }
          .kab-floating-fire {
            width: 68px;
            height: 68px;
          }
          .kab-floating-fire span { font-size: 15px; }
          .kab-floating-fire small { font-size: 8px; }
        }
      `}</style>
    </div>
  );
}
export function ArenaBattleResultCard({
  outcome,
  monster,
  novaHp,
  monsterHp,
  damageDealt,
  damageReceived,
  revivesUsed,
  collection,
}: {
  outcome: "victory" | "escaped" | "defeat" | "in_progress";
  monster: KnowledgeArenaBattleMonster | null;
  novaHp: number;
  monsterHp: number;
  damageDealt: number;
  damageReceived: number;
  revivesUsed: number;
  collection?: { is_new?: boolean; quantity?: number } | null;
}) {
  if (!monster) return null;

  const title =
    outcome === "victory"
      ? "VICTORY"
      : outcome === "escaped"
        ? "MONSTER ESCAPED"
        : outcome === "defeat"
          ? "DEFEAT"
          : "BATTLE COMPLETE";

  const novaResultSprite =
    outcome === "defeat" ? novaSprites.defeated : novaSprites.idle;
  const monsterResultPose: MonsterPose =
    outcome === "victory" ? "defeated" : "idle";
  const monsterResultSprite =
    monsterPoseSprites[monster.slug]?.[monsterResultPose] || monster.sprite_url;

  return (
    <section className={`kab-result-card is-${outcome}`}>
      <div className="kab-result-fighter kab-result-nova">
        <img src={novaResultSprite} alt="Nova" />
        <small>NOVA</small>
      </div>

      <div className="kab-result-center">
        <div className="kab-result-copy">
          <small>{rarityLabel(monster.rarity)} encounter</small>
          <h3>{title}</h3>
          <strong>{monster.name}</strong>

          {outcome === "victory" && collection && (
            <div className={`kab-collection-notice ${collection.is_new ? "is-new" : "is-owned"}`}>
              {collection.is_new ? (
                <>
                  <b>MONSTER ADDED TO COLLECTION</b>
                  <span>{monster.name} is now in your Knowledge Arena collection.</span>
                </>
              ) : (
                <>
                  <b>MONSTER ALREADY COLLECTED</b>
                  <span>Defeat count ×{collection.quantity ?? 1}</span>
                </>
              )}
            </div>
          )}

          {outcome === "victory" && !collection && (
            <p>Log in to save defeated monsters to your Collection.</p>
          )}
        </div>

        <div className="kab-result-stats">
          <span>Nova HP <strong>{novaHp}</strong></span>
          <span>Monster HP <strong>{monsterHp}</strong></span>
          <span>Damage dealt <strong>{damageDealt}</strong></span>
          <span>Damage received <strong>{damageReceived}</strong></span>
          <span>Revives <strong>{revivesUsed}</strong></span>
        </div>
      </div>

      <div className="kab-result-fighter kab-result-monster">
        <img src={monsterResultSprite} alt={monster.name} />
        <small>{monster.name}</small>
      </div>

      <style jsx>{`
        .kab-result-card { display:grid; grid-template-columns:minmax(105px,.7fr) minmax(310px,1.65fr) minmax(105px,.7fr); gap:14px; align-items:stretch; min-height:175px; border:1px solid rgba(126,232,255,.17); border-radius:18px; background:linear-gradient(135deg,rgba(8,37,60,.66),rgba(24,18,57,.68)); padding:12px; overflow:hidden; }
        .kab-result-card.is-victory { border-color:rgba(74,222,128,.3); }
        .kab-result-card.is-defeat { border-color:rgba(248,113,113,.3); }
        .kab-result-fighter { position:relative; display:flex; min-width:0; min-height:150px; flex-direction:column; align-items:center; justify-content:flex-end; overflow:hidden; border-radius:14px; background:radial-gradient(circle at 50% 65%,rgba(126,232,255,.13),rgba(255,255,255,.025) 56%,transparent 74%); }
        .kab-result-fighter img { width:100%; height:132px; object-fit:contain; object-position:center bottom; filter:drop-shadow(0 12px 18px rgba(0,0,0,.4)); }
        .kab-result-fighter small { position:absolute; bottom:5px; max-width:92%; overflow:hidden; border-radius:999px; background:rgba(2,9,24,.78); padding:3px 7px; color:rgba(255,255,255,.72); font-size:7px; font-weight:950; letter-spacing:.08em; text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; }
        .kab-result-nova img { transform:scale(.88); transform-origin:center bottom; }
        .kab-result-monster img { transform:scale(.92); transform-origin:center bottom; }
        .kab-result-center { display:flex; min-width:0; flex-direction:column; justify-content:center; }
        .kab-result-copy { text-align:center; }
        .kab-result-copy > small { color:#7ee8ff; font-size:8px; font-weight:900; letter-spacing:.09em; text-transform:uppercase; }
        .kab-result-copy h3 { margin:3px 0 0; font-size:24px; letter-spacing:-.03em; }
        .kab-result-copy > strong { display:block; margin-top:2px; font-size:14px; }
        .kab-result-copy p { margin:6px 0 0; color:rgba(255,255,255,.58); font-size:9px; }
        .kab-collection-notice { margin:8px auto 0; max-width:430px; border:1px solid rgba(126,232,255,.22); border-radius:11px; background:rgba(126,232,255,.07); padding:7px 9px; }
        .kab-collection-notice.is-new { border-color:rgba(74,222,128,.34); background:rgba(74,222,128,.09); }
        .kab-collection-notice b { display:block; color:#d9fbff; font-size:8px; letter-spacing:.08em; }
        .kab-collection-notice.is-new b { color:#bbf7d0; }
        .kab-collection-notice span { display:block; margin-top:2px; color:rgba(255,255,255,.56); font-size:8px; }
        .kab-result-stats { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:5px; margin-top:9px; }
        .kab-result-stats span { border-radius:8px; background:rgba(255,255,255,.045); padding:6px 5px; color:rgba(255,255,255,.45); font-size:7px; text-align:center; }
        .kab-result-stats strong { display:block; margin-top:2px; color:white; font-size:11px; }
        @media (max-width:850px) {
          .kab-result-card { grid-template-columns:88px minmax(0,1fr) 88px; min-height:142px; gap:7px; padding:8px; }
          .kab-result-fighter { min-height:124px; }
          .kab-result-fighter img { height:112px; }
          .kab-result-copy h3 { font-size:17px; }
          .kab-result-copy > strong { font-size:11px; }
          .kab-collection-notice { margin-top:5px; padding:5px 6px; }
          .kab-collection-notice span { display:none; }
          .kab-result-stats { gap:3px; margin-top:5px; }
          .kab-result-stats span { padding:4px 2px; font-size:5px; }
          .kab-result-stats strong { font-size:8px; }
        }
      `}</style>
    </section>
  );
}
