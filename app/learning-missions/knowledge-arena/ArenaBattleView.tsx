"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
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

const novaSprites: Record<"idle" | "firing" | "hit" | "defeated" | "revive", string> = {
  idle: "/activities/learning-missions/knowledge-arena/nova/nova-battle-idle.png",
  firing: "/activities/learning-missions/knowledge-arena/nova/nova-battle-firing.png",
  hit: "/activities/learning-missions/knowledge-arena/nova/nova-battle-hit.png",
  defeated: "/activities/learning-missions/knowledge-arena/nova/nova-battle-defeated.png",
  revive: "/activities/learning-missions/knowledge-arena/nova/nova-battle-revive.png",
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

function NovaSprite({ phase }: { phase: BattlePhase }) {
  const key =
    phase === "firing"
      ? "firing"
      : phase === "monster_attack" || phase === "hit"
        ? "hit"
        : phase === "reviving"
          ? "revive"
          : phase === "revive" || phase === "defeat"
            ? "defeated"
            : "idle";

  return (
    <div className={`kab-character kab-nova is-${key}`}>
      <div className="kab-character-fallback">NOVA</div>
      <img
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
}: {
  monster: KnowledgeArenaBattleMonster;
  phase: BattlePhase;
}) {
  const defeated = phase === "monster_defeated";
  const attacking = phase === "monster_attack";

  return (
    <div
      className={`kab-character kab-monster ${attacking ? "is-attacking" : ""} ${
        defeated ? "is-defeated" : ""
      }`}
    >
      <div className="kab-character-fallback">{monster.name}</div>
      <img
        src={monster.sprite_url}
        alt={monster.name}
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
  onBack,
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
  onBack: () => void;
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

  const correct = selectedAnswer !== null && selectedAnswer === question.correct_answer;
  const fireSecondsLeft = Math.max(0, fireMsRemaining / 1000);
  const novaCritical = novaHp <= 250;
  const monsterDefeated = monsterHp <= 0;

  function stopFire(event?: ReactPointerEvent<HTMLButtonElement>) {
    event?.preventDefault();
    onStopFiring();
  }

  return (
    <div
      className={`kab-stage ${novaCritical ? "is-nova-critical" : ""}`}
      style={{ backgroundImage: `url("${arenaBackgrounds[topic]}")` }}
    >
      <div className="kab-vignette" />

      <div className="kab-topbar">
        <button type="button" className="kab-back" onClick={onBack}>
          ← Back
        </button>
        <span>{challengeLabel}</span>
        <span>{topicTitle}</span>
        <span>Q {questionIndex + 1}/10</span>
        <span>Correct {correctCount}</span>
        <span>Score {score}</span>
        <strong className={timeLeft <= 3 ? "is-low" : ""}>{timeLeft}s</strong>
      </div>

      <section className="kab-question-hud">
        <div className="kab-question-copy">
          <small>{question.difficulty} · Question {questionIndex + 1}</small>
          <p>{question.question_text}</p>
        </div>
        {question.question_image && (
          <img
            src={question.question_image}
            alt={`Question ${questionIndex + 1}`}
            draggable={false}
            className="kab-question-image"
          />
        )}
      </section>

      <section className="kab-battlefield">
        <div className="kab-fighter-side kab-fighter-left">
          <div className="kab-hp-card">
            <div className="kab-hp-title">
              <strong>NOVA</strong>
              <span>{novaHp} / 1000 HP</span>
            </div>
            <div className="kab-hp-track">
              <i style={{ width: `${hpPercent(novaHp, 1000)}%` }} />
            </div>
          </div>
          <NovaSprite phase={phase} />
        </div>

        <div className="kab-combat-center">
          {battleMessage && <div className="kab-battle-message">{battleMessage}</div>}

          {phase === "firing" && (
            <div className="kab-fire-panel">
              <strong>{monsterDefeated ? "TARGET PRACTICE" : "FIRE!"}</strong>
              <span>{fireSecondsLeft.toFixed(1)}s</span>
              <small>{shotsThisTurn} shots</small>
              <button
                type="button"
                className="kab-fire-button"
                onPointerDown={(event) => {
                  event.preventDefault();
                  onStartFiring();
                }}
                onPointerUp={stopFire}
                onPointerCancel={stopFire}
                onPointerLeave={stopFire}
                onContextMenu={(event) => event.preventDefault()}
              >
                TAP / HOLD FIRE
              </button>
              <em>Desktop: press or hold SPACEBAR · Touch: tap or hold</em>
            </div>
          )}

          {phase === "firing" && shotsThisTurn > 0 && (
            <div key={`shot-${shotsThisTurn}`} className="kab-blaster-shot" aria-hidden="true">
              <i />
            </div>
          )}

          {damageFlash !== null && phase === "firing" && !monsterDefeated && (
            <div className="kab-damage-number kab-monster-damage">-{damageFlash}</div>
          )}

          {damageFlash !== null && phase !== "firing" && (
            <div className="kab-damage-number">-{damageFlash}</div>
          )}

          {phase === "monster_defeated" && (
            <div className="kab-target-eliminated">TARGET ELIMINATED</div>
          )}
        </div>

        <div className="kab-fighter-side kab-fighter-right">
          <div className="kab-hp-card kab-monster-card">
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
          <MonsterSprite monster={monster} phase={phase} />
        </div>
      </section>

      <section className="kab-answer-zone">
        {feedback && answerLocked && (
          <div className={`kab-feedback ${correct ? "is-correct" : "is-wrong"}`}>
            {feedback}
            {wrongStreak > 1 && !correct && monsterHp > 0 && (
              <strong> Wrong streak: {wrongStreak}</strong>
            )}
          </div>
        )}

        <div className="kab-answer-grid">
          {options.map(([label, optionText]) => (
            <button
              key={label}
              type="button"
              disabled={answerLocked}
              onClick={() => onChoose(label)}
              className="kab-answer"
              style={getAnswerStyle(label)}
            >
              <strong>{label}</strong>
              <span>{optionText}</span>
            </button>
          ))}
        </div>
      </section>

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
                    disabled={reviveWorking || !isAuthenticated || tokenBalance < 10}
                    onClick={onReviveDT}
                  >
                    <strong>REVIVE · 10 DT</strong>
                    <small>Balance {tokenBalance} DT</small>
                  </button>
                  <button
                    type="button"
                    disabled={reviveWorking || !isAuthenticated || gemBalance < 1}
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
              disabled={reviveWorking}
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
          width: 100%;
          height: 100%;
          min-height: 0;
          grid-template-rows: auto auto minmax(0, 1fr) auto;
          gap: 8px;
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
            linear-gradient(180deg, rgba(1, 5, 15, 0.52), rgba(1, 5, 15, 0.18) 44%, rgba(1, 5, 15, 0.6)),
            radial-gradient(circle at 50% 55%, transparent 0 34%, rgba(0, 0, 0, 0.28) 78%);
          pointer-events: none;
        }

        .kab-stage.is-nova-critical::after {
          position: absolute;
          inset: 0;
          z-index: 20;
          border: 2px solid rgba(248, 113, 113, 0.32);
          box-shadow: inset 0 0 54px rgba(239, 68, 68, 0.13);
          content: "";
          pointer-events: none;
          animation: kabCritical 0.8s ease-in-out infinite alternate;
        }

        .kab-topbar {
          display: flex;
          z-index: 4;
          align-items: center;
          gap: 6px;
          padding: 8px 10px 0;
        }

        .kab-topbar > span,
        .kab-topbar > strong,
        .kab-back {
          min-height: 32px;
          display: inline-flex;
          align-items: center;
          border: 1px solid rgba(255,255,255,.13);
          border-radius: 999px;
          background: rgba(2, 9, 24, .7);
          padding: 0 10px;
          color: rgba(255,255,255,.78);
          font-size: 10px;
          font-weight: 850;
          backdrop-filter: blur(12px);
          white-space: nowrap;
        }

        .kab-back { cursor: pointer; color: white; }
        .kab-topbar > strong { margin-left: auto; color: #7ee8ff; font-size: 14px; }
        .kab-topbar > strong.is-low { color: #fca5a5; }

        .kab-question-hud {
          display: grid;
          z-index: 4;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          margin: 0 10px;
          border: 1px solid rgba(126,232,255,.18);
          border-radius: 15px;
          background: rgba(2, 9, 24, .73);
          padding: 10px 13px;
          backdrop-filter: blur(14px);
        }

        .kab-question-copy small {
          color: #7ee8ff;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .11em;
          text-transform: uppercase;
        }

        .kab-question-copy p {
          margin: 4px 0 0;
          font-size: clamp(18px, 2vw, 30px);
          font-weight: 850;
          line-height: 1.17;
        }

        .kab-question-image {
          width: min(180px, 20vw);
          max-height: 92px;
          object-fit: contain;
          border-radius: 10px;
          background: rgba(255,255,255,.94);
        }

        .kab-battlefield {
          position: relative;
          display: grid;
          min-height: 0;
          grid-template-columns: minmax(0, 1fr) minmax(150px, .42fr) minmax(0, 1fr);
          align-items: stretch;
          padding: 0 12px;
        }

        .kab-fighter-side {
          position: relative;
          display: flex;
          min-width: 0;
          min-height: 0;
          flex-direction: column;
        }

        .kab-hp-card {
          z-index: 4;
          width: min(390px, 92%);
          border: 1px solid rgba(126,232,255,.2);
          border-radius: 13px;
          background: rgba(2, 9, 24, .72);
          padding: 8px 10px;
          backdrop-filter: blur(12px);
        }

        .kab-fighter-right .kab-hp-card { align-self: flex-end; }

        .kab-hp-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          font-size: 10px;
        }

        .kab-hp-title strong { font-size: 13px; }
        .kab-hp-title span { color: rgba(255,255,255,.62); font-weight: 800; }

        .kab-hp-track {
          height: 9px;
          margin-top: 6px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,.1);
        }

        .kab-hp-track i {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #34d399, #a7f3d0);
          transition: width 260ms ease;
        }

        .kab-monster-hp i { background: linear-gradient(90deg, #f97316, #facc15); }

        .kab-monster-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 5px 10px;
          margin-top: 5px;
          color: rgba(255,255,255,.53);
          font-size: 8px;
          font-weight: 850;
          text-transform: uppercase;
        }

        .kab-character {
          position: absolute;
          inset: 42px 0 0;
          display: flex;
          min-height: 0;
          align-items: flex-end;
          justify-content: center;
        }

        .kab-character img {
          position: relative;
          z-index: 2;
          width: min(94%, 430px);
          height: 100%;
          object-fit: contain;
          object-position: center bottom;
          filter: drop-shadow(0 18px 26px rgba(0,0,0,.42));
          user-select: none;
        }

        .kab-character-fallback {
          position: absolute;
          bottom: 16%;
          display: grid;
          width: min(230px, 58%);
          aspect-ratio: 1;
          place-items: center;
          border: 2px solid rgba(126,232,255,.24);
          border-radius: 48% 52% 44% 56%;
          background: radial-gradient(circle at 35% 30%, rgba(126,232,255,.28), rgba(76,109,255,.16) 45%, rgba(2,9,24,.76));
          color: rgba(255,255,255,.72);
          font-size: 13px;
          font-weight: 950;
          letter-spacing: .1em;
          text-align: center;
          box-shadow: 0 0 48px rgba(83,215,255,.12);
        }

        .kab-monster .kab-character-fallback {
          border-color: rgba(251,146,60,.28);
          background: radial-gradient(circle at 35% 30%, rgba(251,146,60,.26), rgba(126,34,206,.16) 45%, rgba(2,9,24,.8));
        }

        .kab-nova.is-firing { transform: translateX(4%); }
        .kab-nova.is-hit { animation: kabNovaHit 300ms ease; }
        .kab-nova.is-revive { animation: kabNovaRevive 900ms ease both; }
        .kab-nova.is-defeated { transform: rotate(-7deg) translateY(8%); opacity: .74; }
        .kab-monster.is-attacking { animation: kabMonsterAttack 520ms ease; }
        .kab-monster.is-defeated { transform: translateY(12%) rotate(5deg); opacity: .28; filter: grayscale(.65); }

        .kab-combat-center {
          position: relative;
          z-index: 6;
          display: flex;
          min-width: 0;
          align-items: center;
          justify-content: center;
        }

        .kab-battle-message,
        .kab-target-eliminated {
          position: absolute;
          top: 10%;
          width: max-content;
          max-width: min(360px, 34vw);
          border: 1px solid rgba(126,232,255,.25);
          border-radius: 999px;
          background: rgba(2,9,24,.82);
          padding: 8px 12px;
          color: #bff3ff;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: .08em;
          text-align: center;
          text-transform: uppercase;
          backdrop-filter: blur(12px);
        }

        .kab-target-eliminated {
          top: 42%;
          border-color: rgba(74,222,128,.4);
          color: #a7f3d0;
          font-size: 15px;
          box-shadow: 0 0 30px rgba(74,222,128,.15);
        }

        .kab-fire-panel {
          display: grid;
          width: min(220px, 100%);
          place-items: center;
          border: 1px solid rgba(126,232,255,.3);
          border-radius: 18px;
          background: rgba(2,9,24,.82);
          padding: 10px;
          text-align: center;
          box-shadow: 0 0 30px rgba(83,215,255,.12);
          backdrop-filter: blur(14px);
        }

        .kab-fire-panel > strong { color: #7ee8ff; font-size: 16px; letter-spacing: .08em; }
        .kab-fire-panel > span { margin-top: 2px; font-size: 26px; font-weight: 950; }
        .kab-fire-panel > small { color: rgba(255,255,255,.55); font-size: 9px; }
        .kab-fire-panel > em { margin-top: 5px; color: rgba(255,255,255,.42); font-size: 8px; font-style: normal; }

        .kab-fire-button {
          width: 100%;
          min-height: 46px;
          margin-top: 7px;
          border: 1px solid rgba(255,255,255,.4);
          border-radius: 13px;
          background: linear-gradient(90deg, #18c7ca, #327df4 55%, #7658f6);
          color: white;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: .1em;
          cursor: pointer;
          touch-action: none;
          user-select: none;
          box-shadow: 0 12px 28px rgba(50,125,244,.22);
        }

        .kab-blaster-shot {
          position: absolute;
          left: -42%;
          top: 52%;
          width: 184%;
          height: 18px;
          pointer-events: none;
          z-index: 8;
        }

        .kab-blaster-shot i {
          position: absolute;
          left: 0;
          top: 50%;
          width: 34px;
          height: 7px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(255,255,255,.96), #7ee8ff 46%, #327df4);
          box-shadow: 0 0 9px #7ee8ff, 0 0 19px rgba(50,125,244,.9);
          transform: translateY(-50%);
          animation: kabBlasterShot 180ms linear both;
        }

        .kab-monster-damage {
          position: absolute;
          right: -24%;
          top: 38%;
          color: #fde68a;
          text-shadow: 0 4px 18px rgba(250,204,21,.5);
        }

        .kab-damage-number {
          color: #fca5a5;
          font-size: 30px;
          font-weight: 950;
          text-shadow: 0 4px 18px rgba(239,68,68,.45);
          animation: kabDamage 360ms ease forwards;
        }

        .kab-answer-zone {
          z-index: 7;
          display: grid;
          gap: 5px;
          padding: 0 10px 10px;
        }

        .kab-feedback {
          overflow: hidden;
          border: 1px solid rgba(126,232,255,.14);
          border-radius: 10px;
          background: rgba(2,9,24,.78);
          padding: 6px 9px;
          color: rgba(255,255,255,.7);
          font-size: 9px;
          line-height: 1.35;
          text-overflow: ellipsis;
          white-space: nowrap;
          backdrop-filter: blur(10px);
        }
        .kab-feedback.is-correct { border-color: rgba(74,222,128,.24); }
        .kab-feedback.is-wrong { border-color: rgba(248,113,113,.24); }

        .kab-answer-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6px;
        }

        .kab-answer {
          display: grid;
          min-height: 54px;
          grid-template-columns: 32px minmax(0, 1fr);
          align-items: center;
          gap: 9px;
          border-radius: 13px !important;
          padding: 8px 11px !important;
          text-align: left;
          backdrop-filter: blur(11px);
          cursor: pointer;
        }

        .kab-answer > strong {
          display: grid;
          width: 30px;
          height: 30px;
          place-items: center;
          border-radius: 999px;
          background: rgba(255,255,255,.13);
          font-size: 11px;
        }

        .kab-answer > span {
          overflow: hidden;
          font-size: clamp(13px, 1.2vw, 17px);
          font-weight: 750;
          line-height: 1.2;
        }

        .kab-defeat-layer {
          position: absolute;
          inset: 0;
          z-index: 50;
          display: grid;
          place-items: center;
          background: rgba(1,5,15,.74);
          padding: 18px;
          backdrop-filter: blur(6px);
        }

        .kab-defeat-card {
          width: min(560px, 96vw);
          border: 1px solid rgba(248,113,113,.28);
          border-radius: 24px;
          background: linear-gradient(145deg, rgba(50,10,24,.94), rgba(4,13,32,.97));
          padding: 22px;
          text-align: center;
          box-shadow: 0 26px 70px rgba(0,0,0,.5);
        }

        .kab-defeat-card > p { margin: 0; color: #fca5a5; font-size: 11px; font-weight: 950; letter-spacing: .16em; }
        .kab-defeat-card h2 { margin: 7px 0 0; font-size: 30px; }
        .kab-defeat-card > span,
        .kab-defeat-card > small { display: block; margin-top: 6px; color: rgba(255,255,255,.55); font-size: 10px; }

        .kab-revive-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-top: 15px;
        }

        .kab-revive-grid button,
        .kab-accept-defeat {
          min-height: 54px;
          border: 1px solid rgba(126,232,255,.2);
          border-radius: 14px;
          background: rgba(126,232,255,.08);
          color: white;
          cursor: pointer;
        }

        .kab-revive-grid button strong,
        .kab-revive-grid button small { display: block; }
        .kab-revive-grid button strong { font-size: 11px; }
        .kab-revive-grid button small { margin-top: 3px; color: rgba(255,255,255,.5); font-size: 8px; }
        .kab-revive-grid button:disabled { cursor: not-allowed; opacity: .35; }

        .kab-accept-defeat {
          width: 100%;
          margin-top: 9px;
          border-color: rgba(248,113,113,.24);
          background: rgba(239,68,68,.1);
          color: #fecaca;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: .1em;
        }

        .kab-revive-error {
          margin-top: 9px;
          border-radius: 10px;
          background: rgba(239,68,68,.1);
          padding: 8px;
          color: #fecaca;
          font-size: 9px;
        }

        @keyframes kabCritical { from { opacity: .65; } to { opacity: 1; } }
        @keyframes kabNovaHit { 0% { transform: translateX(0); } 35% { transform: translateX(-7%); } 100% { transform: translateX(0); } }
        @keyframes kabMonsterAttack { 0% { transform: translateX(0); } 45% { transform: translateX(-10%); } 100% { transform: translateX(0); } }
        @keyframes kabBlasterShot {
          from { left: 0; transform: translateY(-50%) scaleX(.72); opacity: .15; }
          18% { opacity: 1; }
          to { left: calc(100% - 34px); transform: translateY(-50%) scaleX(1.15); opacity: 0; }
        }

        @keyframes kabNovaRevive {
          0% { transform: translateY(9%) scale(.92); opacity: .15; filter: brightness(1.8) drop-shadow(0 0 26px rgba(126,232,255,.65)); }
          45% { transform: translateY(0) scale(1.04); opacity: 1; filter: brightness(1.35) drop-shadow(0 0 34px rgba(126,232,255,.72)); }
          100% { transform: translateY(0) scale(1); opacity: 1; filter: drop-shadow(0 18px 26px rgba(0,0,0,.42)); }
        }

        @keyframes kabDamage { from { transform: translateY(8px) scale(.85); opacity: 0; } 50% { opacity: 1; } to { transform: translateY(-18px) scale(1.06); opacity: 0; } }

        @media (max-width: 850px), (hover: none) and (pointer: coarse) {
          .kab-topbar > span:nth-of-type(1),
          .kab-topbar > span:nth-of-type(2) { display: none; }
          .kab-topbar > span, .kab-back { min-height: 27px; padding: 0 7px; font-size: 8px; }
          .kab-question-hud { padding: 7px 9px; }
          .kab-question-copy p { font-size: clamp(15px, 3.2vw, 21px); }
          .kab-question-image { max-height: 65px; }
          .kab-battlefield { grid-template-columns: minmax(0, 1fr) minmax(105px, .34fr) minmax(0, 1fr); padding-inline: 7px; }
          .kab-hp-card { padding: 5px 7px; }
          .kab-hp-title { font-size: 8px; }
          .kab-hp-title strong { font-size: 10px; }
          .kab-hp-track { height: 6px; margin-top: 4px; }
          .kab-monster-stats { font-size: 6px; }
          .kab-character { top: 36px; }
          .kab-character-fallback { font-size: 9px; }
          .kab-battle-message { max-width: 32vw; padding: 5px 7px; font-size: 7px; }
          .kab-fire-panel { width: 118px; padding: 6px; }
          .kab-fire-panel > strong { font-size: 10px; }
          .kab-fire-panel > span { font-size: 18px; }
          .kab-fire-button { min-height: 38px; font-size: 9px; }
          .kab-fire-panel > em { display: none; }
          .kab-answer { min-height: 43px; grid-template-columns: 25px minmax(0,1fr); padding: 5px 7px !important; }
          .kab-answer > strong { width: 24px; height: 24px; font-size: 8px; }
          .kab-answer > span { font-size: clamp(10px, 2.5vw, 13px); }
          .kab-feedback { font-size: 7px; }
        }

        @media (max-height: 620px) and (orientation: landscape) {
          .kab-stage { gap: 4px; }
          .kab-topbar { padding-top: 4px; }
          .kab-question-hud { padding-block: 6px; }
          .kab-question-copy p { font-size: clamp(14px, 2vw, 20px); }
          .kab-answer { min-height: 40px; }
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

  return (
    <section className={`kab-result-card is-${outcome}`}>
      <div className="kab-result-monster">
        <div className="kab-result-image-fallback">{monster.name}</div>
        <img
          src={monster.collection_image_url || monster.sprite_url}
          alt={monster.name}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      </div>
      <div className="kab-result-copy">
        <small>{rarityLabel(monster.rarity)} encounter</small>
        <h3>{title}</h3>
        <strong>{monster.name}</strong>
        {outcome === "victory" && collection && (
          <p>
            {collection.is_new
              ? "New monster added to Collections."
              : `Monster defeated again ×${collection.quantity ?? 1}.`}
          </p>
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
      <style jsx>{`
        .kab-result-card { display:grid; grid-template-columns:100px minmax(0,1fr) minmax(280px,.85fr); gap:12px; align-items:center; border:1px solid rgba(126,232,255,.17); border-radius:15px; background:linear-gradient(135deg,rgba(8,37,60,.58),rgba(24,18,57,.6)); padding:11px; }
        .kab-result-card.is-victory { border-color:rgba(74,222,128,.25); }
        .kab-result-card.is-defeat { border-color:rgba(248,113,113,.25); }
        .kab-result-monster { position:relative; display:grid; width:90px; height:90px; place-items:center; overflow:hidden; border-radius:14px; background:rgba(255,255,255,.04); }
        .kab-result-monster img { position:relative; z-index:2; width:100%; height:100%; object-fit:contain; }
        .kab-result-image-fallback { position:absolute; inset:0; display:grid; place-items:center; padding:7px; color:rgba(255,255,255,.45); font-size:9px; font-weight:900; text-align:center; }
        .kab-result-copy small { color:#7ee8ff; font-size:8px; font-weight:900; text-transform:uppercase; }
        .kab-result-copy h3 { margin:3px 0 0; font-size:22px; }
        .kab-result-copy > strong { display:block; margin-top:2px; font-size:13px; }
        .kab-result-copy p { margin:5px 0 0; color:rgba(255,255,255,.56); font-size:9px; }
        .kab-result-stats { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:5px; }
        .kab-result-stats span { border-radius:8px; background:rgba(255,255,255,.04); padding:6px 8px; color:rgba(255,255,255,.45); font-size:8px; }
        .kab-result-stats strong { display:block; margin-top:2px; color:white; font-size:12px; }
        @media (max-width:850px) { .kab-result-card { grid-template-columns:70px minmax(0,1fr); } .kab-result-monster{width:64px;height:64px}.kab-result-stats{grid-column:1/-1;grid-template-columns:repeat(5,minmax(0,1fr))}.kab-result-stats span{padding:4px;font-size:6px}.kab-result-stats strong{font-size:9px}.kab-result-copy h3{font-size:16px} }
      `}</style>
    </section>
  );
}
