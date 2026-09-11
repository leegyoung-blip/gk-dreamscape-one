"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

type Answer = "A" | "B" | "C" | "D";

type CoopQuestion = {
  id: string;
  question_text: string;
  question_image: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: Answer;
  explanation: string;
};

export type CoopPlayerView = {
  id: string;
  display_name: string;
  nova_colorway?: string | null;
  nova_hp?: number | null;
  is_eliminated?: boolean | null;
  battle_damage?: number | null;
  last_attack_score?: number | null;
  last_damage_received?: number | null;
};

export type CoopMonsterView = {
  id: string;
  slug: string;
  name: string;
  rarity?: string | null;
  sprite_url?: string | null;
  hp?: number | null;
  attack_damage?: number | null;
};

export type CoopRoundResult = {
  resolved?: boolean;
  question_index?: number;
  monster_hp?: number;
  monster_hp_start?: number;
  dreamkeeper_active?: boolean;
  dreamkeeper_damage?: number;
  attacks?: Array<{
    player_id: string;
    display_name: string;
    colorway?: string | null;
    seconds_used?: number;
    damage: number;
    target: "monster" | "dreamkeeper";
  }>;
  retaliations?: Array<{
    player_id: string;
    display_name: string;
    colorway?: string | null;
    damage: number;
    eliminated?: boolean;
    attacker?: "monster" | "dreamkeeper";
  }>;
};

type SequenceEvent =
  | { type: "attack"; playerId: string; value: number; target: "monster" | "dreamkeeper" }
  | { type: "retaliation"; playerId: string; value: number; attacker: "monster" | "dreamkeeper" };

const arenaBackgrounds: Record<string, string> = {
  world_explorer:
    "/activities/learning-missions/knowledge-arena/arenas/world-explorer-arena.png",
  time_traveller:
    "/activities/learning-missions/knowledge-arena/arenas/time-traveller-arena.png",
  science_sparks:
    "/activities/learning-missions/knowledge-arena/arenas/science-sparks-arena.png",
};

const novaIdle =
  "/activities/learning-missions/knowledge-arena/nova/nova-battle-idle.png";
const novaFiring =
  "/activities/learning-missions/knowledge-arena/nova/nova-battle-firing.png";
const novaHit =
  "/activities/learning-missions/knowledge-arena/nova/nova-battle-hit.png";

function monsterSprite(slug: string, pose: "idle" | "attack" | "hit") {
  return `/activities/learning-missions/knowledge-arena/monsters/${slug}/${pose}.png`;
}

function clampHp(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

const COOP_NOVA_BARREL = { x: 898 / 1122, y: 376 / 1402 } as const;
const COOP_MONSTER_HOTSPOTS: Record<string, { x: number; y: number }> = {
  "atlas-golem": { x: .36, y: .46 },
  "tempest-roc": { x: .42, y: .46 },
  "worldbreaker-leviathan": { x: .30, y: .46 },
  "verdant-sabertooth": { x: .34, y: .46 },
};
function containedRect(image: HTMLImageElement, source?: {width:number;height:number}) {
  const box=image.getBoundingClientRect();
  const nw=source?.width || image.naturalWidth || box.width || 1;
  const nh=source?.height || image.naturalHeight || box.height || 1;
  const scale=Math.min(box.width/nw,box.height/nh);
  const width=nw*scale, height=nh*scale;
  return {left:box.left+(box.width-width)/2,top:box.top+(box.height-height)/2,width,height};
}
function hotspot(image:HTMLImageElement, point:{x:number;y:number}, source?:{width:number;height:number}) {
  const r=containedRect(image,source);
  return {x:r.left+r.width*point.x,y:r.top+r.height*point.y};
}

function answerEntries(question: CoopQuestion): [Answer, string][] {
  return [
    ["A", question.option_a],
    ["B", question.option_b],
    ["C", question.option_c],
    ["D", question.option_d],
  ];
}

export function ArenaCoopBattleView({
  topic,
  question,
  questionIndex,
  timeLeft,
  timerSeconds,
  answerLocked,
  selectedAnswer,
  feedback,
  getAnswerStyle,
  onChoose,
  players,
  myPlayerId,
  monster,
  monsterHp,
  monsterHpStart,
  dreamkeeperActive,
  dreamkeeperDamage,
  roundStatus,
  roundResult,
  myAttackScore,
}: {
  topic: string;
  question: CoopQuestion;
  questionIndex: number;
  timeLeft: number;
  timerSeconds: 10 | 20;
  answerLocked: boolean;
  selectedAnswer: Answer | null;
  feedback: string | null;
  getAnswerStyle: (answer: Answer) => CSSProperties;
  onChoose: (answer: Answer) => void;
  players: CoopPlayerView[];
  myPlayerId: string | null;
  monster: CoopMonsterView | null;
  monsterHp: number;
  monsterHpStart: number;
  dreamkeeperActive: boolean;
  dreamkeeperDamage: number;
  roundStatus: string;
  roundResult: CoopRoundResult | null;
  myAttackScore: number;
}) {
  const [sequenceIndex, setSequenceIndex] = useState(-1);

  const sequence = useMemo<SequenceEvent[]>(() => {
    if (!roundResult?.resolved) return [];
    return [
      ...(roundResult.attacks || []).map((item) => ({
        type: "attack" as const,
        playerId: item.player_id,
        value: Number(item.damage || 0),
        target: item.target,
      })),
      ...(roundResult.retaliations || []).map((item) => ({
        type: "retaliation" as const,
        playerId: item.player_id,
        value: Number(item.damage || 0),
        attacker: item.attacker || "monster",
      })),
    ];
  }, [roundResult]);

  useEffect(() => {
    if (!roundResult?.resolved || sequence.length === 0) {
      setSequenceIndex(-1);
      return;
    }

    setSequenceIndex(0);
    const timers = sequence.slice(1).map((_, index) =>
      window.setTimeout(() => setSequenceIndex(index + 1), (index + 1) * 430)
    );
    const finishTimer = window.setTimeout(
      () => setSequenceIndex(sequence.length),
      Math.max(1, sequence.length) * 430 + 300
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(finishTimer);
    };
  }, [roundResult?.question_index, roundResult?.resolved, sequence.length]);

  const activeEvent =
    sequenceIndex >= 0 && sequenceIndex < sequence.length
      ? sequence[sequenceIndex]
      : null;
  const options = answerEntries(question);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const novaImageRefs = useRef<Record<string, HTMLImageElement | null>>({});
  const enemyImageRef = useRef<HTMLImageElement | null>(null);
  const enemyBoxRef = useRef<HTMLDivElement | null>(null);
  const [attackBeam, setAttackBeam] = useState<{x:number;y:number;length:number;angle:number} | null>(null);
  const myPlayer = players.find((player) => player.id === myPlayerId) || null;
  const myGhost = Boolean(myPlayer?.is_eliminated);

  const showDreamkeeper =
    Boolean(dreamkeeperActive) &&
    !(
      activeEvent?.type === "attack" &&
      activeEvent.target === "monster"
    );

  const enemyPose: "idle" | "attack" | "hit" =
    activeEvent?.type === "retaliation"
      ? "attack"
      : activeEvent?.type === "attack"
        ? "hit"
        : "idle";

  useEffect(() => {
    if (activeEvent?.type !== "attack") {
      setAttackBeam(null);
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      const stage=stageRef.current;
      const nova=novaImageRefs.current[activeEvent.playerId];
      if (!stage || !nova) return;
      const stageBox=stage.getBoundingClientRect();
      const start=hotspot(nova,COOP_NOVA_BARREL,{width:1122,height:1402});
      let end:{x:number;y:number} | null=null;
      if (!showDreamkeeper && enemyImageRef.current) {
        end=hotspot(enemyImageRef.current,COOP_MONSTER_HOTSPOTS[monster?.slug || ""] || {x:.4,y:.45});
      } else if (enemyBoxRef.current) {
        const r=enemyBoxRef.current.getBoundingClientRect();
        end={x:r.left+r.width*.5,y:r.top+r.height*.42};
      }
      if (!end) return;
      const x=start.x-stageBox.left;
      const y=start.y-stageBox.top;
      const dx=end.x-start.x;
      const dy=end.y-start.y;
      setAttackBeam({x,y,length:Math.hypot(dx,dy),angle:Math.atan2(dy,dx)*180/Math.PI});
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeEvent, showDreamkeeper, monster?.slug]);

  return (
    <div
      ref={stageRef}
      className="kac-stage"
      style={{ backgroundImage: `url("${arenaBackgrounds[topic] || arenaBackgrounds.world_explorer}")` }}
    >
      <div className="kac-shade" />

      <div className="kac-top-row">
        <div className="kac-question-card">
          <div className="kac-question-meta">
            <span>CO-OP · Q {questionIndex + 1}/10</span>
            <strong className={timeLeft <= 3 ? "is-low" : ""}>{timeLeft}s</strong>
          </div>
          <h2>{question.question_text}</h2>
          {question.question_image && (
            <img src={question.question_image} alt="" className="kac-question-image" />
          )}
        </div>

        <div className="kac-options">
          {options.map(([label, text]) => (
            <button
              key={label}
              type="button"
              disabled={answerLocked || roundStatus !== "answering"}
              onClick={() => onChoose(label)}
              style={getAnswerStyle(label)}
              className="kac-answer"
            >
              <strong>{label}</strong>
              <span>{text}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="kac-arena-divider" aria-hidden="true" />

      <div className="kac-battlefield">
        <div className="kac-team">
          {players.map((player) => {
            const isAttacking =
              activeEvent?.type === "attack" && activeEvent.playerId === player.id;
            const isHit =
              activeEvent?.type === "retaliation" && activeEvent.playerId === player.id;
            const ghost = Boolean(player.is_eliminated);
            const sprite = isHit ? novaHit : isAttacking ? novaFiring : novaIdle;
            return (
              <div
                key={player.id}
                className={`kac-player kac-color-${player.nova_colorway || "azure"} ${ghost ? "is-ghost" : ""} ${isAttacking ? "is-attacking" : ""} ${isHit ? "is-hit" : ""}`}
              >
                <div className="kac-player-name">
                  <strong>{player.display_name}</strong>
                  {player.id === myPlayerId && <small>YOU</small>}
                </div>
                <div className="kac-player-sprite">
                  <img
                    ref={(node) => { novaImageRefs.current[player.id] = node; }}
                    src={sprite}
                    alt=""
                    draggable={false}
                  />
                  {ghost && <span className="kac-ghost-skull">☠</span>}
                  {isAttacking && activeEvent?.type === "attack" && (
                    <b className="kac-damage kac-damage-enemy">-{activeEvent.value}</b>
                  )}
                  {isHit && activeEvent?.type === "retaliation" && (
                    <b className="kac-damage kac-damage-player">-{activeEvent.value}</b>
                  )}
                </div>
                <div className="kac-player-hp-copy">
                  <span>{ghost ? "GHOST" : "HP"}</span>
                  <strong>{ghost ? "0 / 1000" : `${Number(player.nova_hp || 0)} / 1000`}</strong>
                </div>
                <div className="kac-mini-hp">
                  <i style={{ width: `${clampHp(Number(player.nova_hp || 0), 1000)}%` }} />
                </div>
                <small className="kac-player-stat">
                  {ghost ? "SKELETON GHOST · 0 DMG" : `${Number(player.battle_damage || 0)} TOTAL DMG`}
                </small>
              </div>
            );
          })}
        </div>

        <div ref={enemyBoxRef} className={`kac-enemy ${showDreamkeeper ? "is-dreamkeeper" : ""}`}>
          <div className="kac-enemy-title">
            <span>{showDreamkeeper ? "FINAL TARGET" : "CO-OP MONSTER"}</span>
            <strong>{showDreamkeeper ? "DREAMKEEPER" : monster?.name || "Monster"}</strong>
          </div>

          {showDreamkeeper ? (
            <div className="kac-dreamkeeper-silhouette">
              <div className="kac-dreamkeeper-eye" />
              <span>∞</span>
            </div>
          ) : monster ? (
            <img
              ref={enemyImageRef}
              src={monsterSprite(monster.slug, enemyPose)}
              alt=""
              className="kac-enemy-image"
              draggable={false}
              onError={(event) => {
                if (monster.sprite_url) event.currentTarget.src = monster.sprite_url;
              }}
            />
          ) : (
            <div className="kac-dreamkeeper-silhouette"><span>?</span></div>
          )}

          <div className="kac-enemy-hp">
            <div className="kac-enemy-hp-title">
              <strong>{showDreamkeeper ? "∞ HP" : `${monsterHp} / ${monsterHpStart} HP`}</strong>
              {showDreamkeeper && <span>{dreamkeeperDamage} team damage</span>}
            </div>
            <div className="kac-enemy-track">
              <i style={{ width: showDreamkeeper ? "100%" : `${clampHp(monsterHp, monsterHpStart)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {attackBeam && (
        <div className="kac-laser-layer" aria-hidden="true">
          <i className="kac-laser-muzzle" style={{left:attackBeam.x,top:attackBeam.y}} />
          <span
            className="kac-laser-beam"
            style={{left:attackBeam.x,top:attackBeam.y,width:`${attackBeam.length}px`,"--beam-angle":`${attackBeam.angle}deg`} as CSSProperties}
          />
        </div>
      )}

      <div className="kac-bottom-status">
        {roundStatus === "answering" && !answerLocked && (
          <div className="kac-status-card">
            <strong>Answer fast.</strong>
            <span>Correct players attack first. Faster answers deal more damage.</span>
          </div>
        )}

        {answerLocked && roundStatus === "answering" && (
          <div className={`kac-status-card ${myGhost ? "is-ghost-status" : ""}`}>
            <strong>{myGhost ? "Answer locked · Ghost observer" : myAttackScore > 0 ? `Attack ready · ${myAttackScore} DMG` : "Answer locked"}</strong>
            <span>{myGhost ? "You can still answer, but skeleton ghosts deal no damage." : "Waiting for the rest of the team…"}</span>
          </div>
        )}

        {roundStatus === "resolved" && (
          <div className="kac-round-result">
            <strong>{showDreamkeeper ? "DREAMKEEPER PHASE" : "ROUND RESOLVED"}</strong>
            <span>
              Correct Novas attacked first. The enemy then struck players who answered incorrectly.
            </span>
          </div>
        )}

        {feedback && answerLocked && (
          <div className="kac-feedback">{feedback}</div>
        )}
      </div>

      <style jsx>{`
        .kac-stage {
          position: relative;
          display: grid;
          grid-template-rows: auto auto minmax(0, 1fr) auto;
          width: 100%;
          height: 100%;
          min-height: 0;
          overflow: hidden;
          border-radius: 18px;
          background-size: cover;
          background-position: center;
          color: white;
          isolation: isolate;
        }
        .kac-shade {
          position: absolute;
          inset: 0;
          z-index: -1;
          background: linear-gradient(180deg, rgba(2,7,18,.42), rgba(2,7,18,.05) 38%, rgba(2,7,18,.44));
        }
        .kac-top-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(340px, .92fr);
          gap: 12px;
          padding: 12px 14px 0;
          align-items: start;
        }
        .kac-question-card,
        .kac-answer,
        .kac-status-card,
        .kac-round-result,
        .kac-feedback {
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(5,12,27,.82);
          backdrop-filter: blur(8px);
        }
        .kac-arena-divider { height:2px; margin:7px 14px 0; border-radius:999px; background:linear-gradient(90deg,transparent,rgba(126,232,255,.72) 12%,rgba(126,232,255,.96) 50%,rgba(126,232,255,.72) 88%,transparent); box-shadow:0 0 12px rgba(126,232,255,.34); }
        .kac-question-card { border-radius: 16px; padding: 14px 16px; }
        .kac-question-meta { display: flex; justify-content: space-between; gap: 10px; color: #86eaff; font-size: 11px; font-weight: 900; letter-spacing: .08em; }
        .kac-question-meta .is-low { color: #ff8d8d; }
        .kac-question-card h2 { margin: 7px 0 0; font-size: clamp(18px, 2vw, 30px); line-height: 1.15; }
        .kac-question-image { margin-top: 8px; max-width: 100%; max-height: 95px; object-fit: contain; border-radius: 10px; }
        .kac-options { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; }
        .kac-answer { min-height: 72px; display: grid; grid-template-columns: auto 1fr; gap: 9px; align-items: center; border-radius: 14px; padding: 10px 12px; color: white; text-align: left; }
        .kac-answer strong { display: grid; width: 30px; height: 30px; place-items: center; border-radius: 50%; background: rgba(255,255,255,.12); }
        .kac-answer span { font-size: 14px; font-weight: 800; line-height: 1.2; }
        .kac-battlefield { min-height: 0; display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(180px, .6fr); gap: 14px; padding: 8px 20px 0; align-items: end; overflow: hidden; }
        .kac-team { min-width: 0; display: flex; align-items: flex-end; justify-content: center; gap: clamp(4px, 1.2vw, 14px); height: 100%; }
        .kac-player { width: min(15vw, 150px); min-width: 72px; display: grid; grid-template-rows: auto minmax(0,1fr) auto auto; align-items: end; transition: transform .2s ease, opacity .2s ease; }
        .kac-player.is-attacking { transform: translateX(12px) translateY(-3px); }
        .kac-player.is-hit { animation: kacHit .3s ease; }
        .kac-player.is-ghost { opacity: .60; filter: grayscale(.7); }
        .kac-player-name { display: flex; justify-content: center; gap: 5px; align-items: center; font-size: 12px; text-align: center; font-weight: 900; }
        .kac-player-name small { border-radius: 999px; padding: 2px 5px; background: rgba(126,232,255,.18); font-size: 7px; }
        .kac-player-sprite { position: relative; height: min(25vh, 190px); display: flex; align-items: flex-end; justify-content: center; }
        .kac-player-sprite img { width: 100%; height: 100%; object-fit: contain; object-position: center bottom; filter: var(--nova-filter, none) drop-shadow(0 10px 18px rgba(0,0,0,.28)); }
        .kac-color-azure { --nova-filter: none; }
        .kac-color-violet { --nova-filter: hue-rotate(48deg) saturate(1.15); }
        .kac-color-crimson { --nova-filter: hue-rotate(138deg) saturate(1.35); }
        .kac-color-emerald { --nova-filter: hue-rotate(255deg) saturate(1.18); }
        .kac-color-gold { --nova-filter: hue-rotate(185deg) saturate(1.45) brightness(1.08); }
        .kac-ghost-skull { position: absolute; left: 50%; top: 25%; transform: translate(-50%,-50%); font-size: 30px; filter: none; text-shadow: 0 0 18px rgba(208,247,255,.8); animation: kacGhost 1.7s ease-in-out infinite; }
        .kac-player-hp-copy { display:flex; justify-content:space-between; gap:6px; align-items:center; margin:5px 1px 4px; font-size:10px; line-height:1; }
        .kac-player-hp-copy span { color:rgba(255,255,255,.62); font-size:9px; font-weight:950; letter-spacing:.08em; }
        .kac-player-hp-copy strong { color:#d8ffeb; font-size:11px; font-weight:950; }
        .kac-mini-hp { height: 10px; border: 1px solid rgba(255,255,255,.22); border-radius: 999px; background: rgba(0,0,0,.42); overflow: hidden; box-shadow: inset 0 0 0 1px rgba(0,0,0,.18); }
        .kac-mini-hp i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg,#39dc90,#b6ffd3); }
        .kac-player-stat { display: block; min-height: 22px; margin-top: 5px; color: rgba(255,255,255,.82); font-size: 10px; font-weight:850; text-align: center; }
        .kac-enemy { min-width:0; height:100%; display:grid; grid-template-rows:auto minmax(0,1fr) auto; justify-items:center; align-items:end; align-self:stretch; }
        .kac-enemy-title { text-align: center; margin-bottom: 2px; }
        .kac-enemy-title span { display: block; color: #ffbd85; font-size: 10px; font-weight: 950; letter-spacing: .12em; }
        .kac-enemy-title strong { font-size: 17px; }
        .kac-enemy-image { width:min(30vw,360px); height:100%; max-height:100%; object-fit:contain; object-position:center bottom; filter:drop-shadow(0 12px 24px rgba(0,0,0,.38)); }
        .kac-dreamkeeper-silhouette { position: relative; display: grid; width:min(28vw,330px); height:100%; max-height:100%; place-items: center; border-radius: 46% 46% 34% 34%; background: radial-gradient(circle at 50% 35%, rgba(158,73,255,.40), rgba(17,4,40,.94) 48%, rgba(0,0,0,.95)); box-shadow: 0 0 48px rgba(145,61,255,.32); font-size: 58px; font-weight: 950; }
        .kac-dreamkeeper-eye { position: absolute; top: 31%; width: 54px; height: 20px; border-radius: 50%; background: #ff3f7c; box-shadow: 0 0 22px rgba(255,63,124,.95); }
        .kac-enemy-hp { width: min(100%, 300px); border: 1px solid rgba(255,255,255,.24); border-radius: 13px; background: rgba(4,10,22,.90); padding: 10px 11px; box-shadow:0 8px 20px rgba(0,0,0,.18); }
        .kac-enemy-hp-title { display: flex; justify-content: space-between; gap: 8px; align-items: center; margin-bottom: 7px; font-size: 12px; font-weight:900; }
        .kac-enemy-hp-title span { color: rgba(255,255,255,.65); }
        .kac-enemy-track { height: 13px; border:1px solid rgba(255,255,255,.15); border-radius: 999px; background: rgba(0,0,0,.38); overflow: hidden; }
        .kac-enemy-track i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg,#ff6f31,#ffd05c); }
        .is-dreamkeeper .kac-enemy-track i { background: linear-gradient(90deg,#8a37ff,#ff3f9b); }
        .kac-laser-layer { position:absolute; inset:0; z-index:4; pointer-events:none; }
        .kac-laser-muzzle { position:absolute; width:12px; height:12px; margin:-6px 0 0 -6px; border-radius:50%; background:#fff; box-shadow:0 0 8px #fff,0 0 18px #38cfff; animation:kacLaserPulse .34s ease-out infinite alternate; }
        .kac-laser-beam { position:absolute; height:5px; margin-top:-2.5px; border-radius:999px; transform:rotate(var(--beam-angle)); transform-origin:left center; background:linear-gradient(180deg,#fff 0 20%,#87efff 24% 65%,#23a9ff 70% 100%); box-shadow:0 0 6px #fff,0 0 12px rgba(56,200,255,.95),0 0 22px rgba(38,130,255,.58); animation:kacLaserPulse .34s ease-out infinite alternate; }
        .kac-damage { position: absolute; z-index: 3; border-radius: 999px; background: rgba(156,0,0,.66); padding: 4px 7px; color: #ff8585; font-size: 17px; font-weight: 950; animation: kacDamage 1s ease-out forwards; }
        .kac-damage-enemy { right: -10%; top: 24%; }
        .kac-damage-player { left: 50%; top: 24%; transform: translateX(-50%); }
        .kac-bottom-status { display: grid; gap: 6px; padding: 0 14px 12px; }
        .kac-status-card, .kac-round-result, .kac-feedback { justify-self: center; width: min(700px, 100%); border-radius: 12px; padding: 9px 12px; text-align: center; }
        .kac-status-card strong, .kac-round-result strong { display: block; font-size: 16px; }
        .kac-status-card span, .kac-round-result span, .kac-feedback { font-size: 13px; line-height: 1.4; }
        .kac-round-result { border-color: rgba(255,197,95,.30); background: rgba(48,22,4,.82); }
        .is-ghost-status { border-color: rgba(170,232,255,.25); }
        @keyframes kacLaserPulse { from{opacity:.68;filter:brightness(1)} to{opacity:1;filter:brightness(1.6)} }
        @keyframes kacDamage { 0%{opacity:0;transform:translateY(8px) scale(.8)} 14%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-30px) scale(1.06)} }
        @keyframes kacHit { 0%,100%{transform:translateX(0)} 40%{transform:translateX(-8px)} 70%{transform:translateX(4px)} }
        @keyframes kacGhost { 0%,100%{transform:translate(-50%,-50%) translateY(0)} 50%{transform:translate(-50%,-50%) translateY(-6px)} }
        @media (max-width: 850px) {
          .kac-top-row { grid-template-columns: 1fr 1fr; gap: 7px; padding: 7px 8px 0; }
          .kac-question-card { padding: 9px 10px; border-radius: 12px; }
          .kac-question-meta { font-size: 8px; }
          .kac-question-card h2 { font-size: clamp(13px,2.6vw,18px); }
          .kac-options { gap: 5px; }
          .kac-answer { min-height: 48px; gap: 5px; padding: 6px 7px; border-radius: 10px; }
          .kac-answer strong { width: 22px; height: 22px; font-size: 10px; }
          .kac-answer span { font-size: 10px; }
          .kac-battlefield { grid-template-columns: minmax(0,1.5fr) minmax(105px,.5fr); gap: 5px; padding: 3px 8px 0; }
          .kac-team { gap: 2px; }
          .kac-player { width: min(11vw, 68px); min-width: 44px; }
          .kac-player-sprite { height: min(16vh, 84px); }
          .kac-player-name strong { max-width: 72px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 9px; }
          .kac-player-name small { display: none; }
          .kac-player-stat { font-size: 8px; min-height: 16px; }
          .kac-player-hp-copy { margin:3px 0 3px; font-size:8px; }
          .kac-player-hp-copy span { font-size:7px; }
          .kac-player-hp-copy strong { font-size:8px; }
          .kac-mini-hp { height: 7px; }
          .kac-ghost-skull { font-size: 18px; }
          .kac-enemy-title span { font-size: 8px; }
          .kac-enemy-title strong { font-size: 12px; }
          .kac-enemy-image { width:min(24vw,155px); height:100%; max-height:100%; }
          .kac-dreamkeeper-silhouette { width:min(22vw,145px); height:100%; max-height:100%; font-size:28px; }
          .kac-dreamkeeper-eye { width: 28px; height: 10px; }
          .kac-enemy-hp { padding: 7px 8px; }
          .kac-enemy-hp-title { font-size: 9px; }
          .kac-enemy-track { height: 8px; }
          .kac-bottom-status { gap: 4px; padding: 0 8px 7px; }
          .kac-status-card, .kac-round-result, .kac-feedback { padding: 7px 9px; border-radius: 9px; }
          .kac-status-card strong, .kac-round-result strong { font-size: 13px; }
          .kac-status-card span, .kac-round-result span, .kac-feedback { font-size: 11px; }
        }
      `}</style>
    </div>
  );
}
