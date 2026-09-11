"use client";

import type { CSSProperties } from "react";

type Answer = "A" | "B" | "C" | "D";
type Question = { id:string; question_text:string; question_image:string|null; option_a:string; option_b:string; option_c:string; option_d:string; correct_answer:Answer; explanation:string; };

export type VersusRacePlayer = {
  id:string; display_name:string; character_type:"nova"|"monster"|null; character_slug:string|null;
  race_progress:number; score:number; correct_count:number; answer_time_total:number;
};
export type VersusRaceMonster = { slug:string; name:string; sprite_url:string; };

const arenaBackgrounds: Record<string,string> = {
  world_explorer:"/activities/learning-missions/knowledge-arena/arenas/world-explorer-arena.png",
  time_traveller:"/activities/learning-missions/knowledge-arena/arenas/time-traveller-arena.png",
  science_sparks:"/activities/learning-missions/knowledge-arena/arenas/science-sparks-arena.png",
};
const novaSprites:Record<string,string> = {
  original:"/activities/learning-missions/knowledge-arena/nova/nova-battle-idle.png",
  striker:"/activities/learning-missions/knowledge-arena/versus/novas/nova-striker.png",
  pulse:"/activities/learning-missions/knowledge-arena/versus/novas/nova-pulse.png",
  vanguard:"/activities/learning-missions/knowledge-arena/versus/novas/nova-vanguard.png",
};
function spriteFor(player:VersusRacePlayer, monsters:VersusRaceMonster[]) {
  if (player.character_type === "monster") return monsters.find((monster)=>monster.slug===player.character_slug)?.sprite_url || "";
  return novaSprites[player.character_slug || "original"] || novaSprites.original;
}

export function ArenaVersusRaceView({topic,question,questionIndex,timeLeft,answerLocked,selectedAnswer,feedback,getAnswerStyle,onChoose,players,monsters,myPlayerId,roundStatus}:{
  topic:string; question:Question; questionIndex:number; timeLeft:number; answerLocked:boolean; selectedAnswer:Answer|null; feedback:string|null;
  getAnswerStyle:(answer:Answer)=>CSSProperties; onChoose:(answer:Answer)=>void; players:VersusRacePlayer[]; monsters:VersusRaceMonster[]; myPlayerId:string|null; roundStatus:string;
}) {
  const options:[Answer,string][] = [["A",question.option_a],["B",question.option_b],["C",question.option_c],["D",question.option_d]];
  const standings=[...players].sort((a,b)=>Number(b.race_progress)-Number(a.race_progress)||b.correct_count-a.correct_count||Number(a.answer_time_total)-Number(b.answer_time_total));
  const me=players.find((player)=>player.id===myPlayerId) || null;
  const markers=[0,300,600,900,1200];

  return <div className="kavr-stage" style={{backgroundImage:`url("${arenaBackgrounds[topic]||arenaBackgrounds.world_explorer}")`}}>
    <div className="kavr-shade" />
    <div className="kavr-topbar">
      <span>Q {questionIndex+1}/10</span>
      <span>{roundStatus==="resolved"?"ROUND COMPLETE":"VERSUS RACE"}</span>
      <span className="kavr-score">Score <strong>{Math.round(Number(me?.score||0))}</strong></span>
      <strong className="kavr-time">{timeLeft}s</strong>
    </div>
    <div className="kavr-question-row">
      <div className="kavr-question"><h2>{question.question_text}</h2>{question.question_image&&<img src={question.question_image} alt="" draggable={false}/>} {feedback&&<div className="kavr-feedback">{feedback}</div>}</div>
      <div className="kavr-options">{options.map(([label,text])=><button key={label} type="button" disabled={answerLocked||roundStatus!=="answering"} onClick={()=>onChoose(label)} style={getAnswerStyle(label)}><strong>{label}</strong><span>{text}</span></button>)}</div>
    </div>
    <div className="kavr-track-wrap">
      <div className="kavr-track-title"><span>START</span><strong>Correct + faster = farther</strong><span>FINISH</span></div>
      <div className="kavr-track">
        <div className="kavr-finish-line" />
        <div className="kavr-distance-markers" aria-hidden="true">
          {markers.map((marker)=>{const left=Math.min(94,(marker/1200)*94);return <div key={marker} className="kavr-marker" style={{left:`${left}%`}}><i/><span>{marker}m</span></div>})}
        </div>
        {standings.map((player,index)=>{const distance=Math.max(0,Math.min(1200,Number(player.race_progress||0)));const percent=Math.min(94,(distance/1200)*94);const src=spriteFor(player,monsters);return <div key={player.id} className={`kavr-lane ${player.id===myPlayerId?"is-me":""}`}>
          <div className="kavr-lane-rank">#{index+1}</div>
          <div className="kavr-runner" style={{left:`${percent}%`}}>{src&&<img src={src} alt="" draggable={false}/>}<span>{player.display_name}<small>{Math.round(Number(player.score||0))} pts</small></span></div>
          <div className="kavr-distance">{Math.round(distance)}m</div>
        </div>})}
      </div>
    </div>
    <style jsx>{`
      .kavr-stage{position:relative;display:grid;grid-template-rows:auto auto minmax(0,1fr);width:100%;height:100%;overflow:hidden;border-radius:18px;background-size:cover;background-position:center;color:white;isolation:isolate}.kavr-shade{position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(1,6,17,.56),rgba(1,6,17,.1) 48%,rgba(1,6,17,.55))}
      .kavr-topbar{display:grid;grid-template-columns:1fr auto auto auto;align-items:center;gap:10px;padding:9px 13px 0;font-size:11px;font-weight:900}.kavr-topbar>span:nth-child(2){color:#79e8ff;letter-spacing:.13em}.kavr-score{border-radius:999px;background:rgba(4,10,25,.72);padding:6px 10px}.kavr-score strong{color:#ffd76d;font-size:13px}.kavr-time{border-radius:999px;background:rgba(4,10,25,.75);padding:6px 11px}
      .kavr-question-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:8px 13px}.kavr-question{border:1px solid rgba(126,232,255,.18);border-radius:16px;background:rgba(5,13,29,.84);padding:12px;backdrop-filter:blur(7px)}.kavr-question h2{margin:0;font-size:clamp(18px,2.15vw,31px);line-height:1.15}.kavr-question img{max-height:80px;max-width:100%;object-fit:contain;margin-top:8px}.kavr-feedback{margin-top:8px;border-radius:10px;background:rgba(255,255,255,.06);padding:7px 9px;font-size:11px;font-weight:800}.kavr-options{display:grid;grid-template-columns:1fr 1fr;gap:8px}.kavr-options button{min-height:66px;display:grid;grid-template-columns:auto 1fr;align-items:center;gap:8px;border-radius:14px;padding:9px 11px;text-align:left}.kavr-options strong{display:grid;width:28px;height:28px;place-items:center;border-radius:999px;background:rgba(255,255,255,.12)}.kavr-options span{font-weight:800}
      .kavr-track-wrap{min-height:0;padding:0 13px 12px;display:grid;grid-template-rows:auto minmax(0,1fr)}.kavr-track-title{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;color:rgba(255,255,255,.65);font-size:9px;font-weight:900;letter-spacing:.12em}.kavr-track-title strong{text-align:center;color:white;font-size:10px;letter-spacing:0}.kavr-track{position:relative;display:grid;gap:4px;align-content:center;min-height:0;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:linear-gradient(90deg,rgba(2,7,18,.55),rgba(7,23,38,.3));padding:20px 20px 7px 32px;overflow:hidden}.kavr-finish-line{position:absolute;z-index:2;top:0;bottom:0;right:5%;width:7px;background:repeating-linear-gradient(180deg,#fff 0 7px,#1b1b1b 7px 14px);opacity:.78}
      .kavr-distance-markers{position:absolute;z-index:0;inset:0 5% 0 32px;pointer-events:none}.kavr-marker{position:absolute;top:0;bottom:0}.kavr-marker i{position:absolute;top:18px;bottom:0;width:1px;background:rgba(255,255,255,.13)}.kavr-marker span{position:absolute;top:3px;transform:translateX(-50%);font-size:8px;font-weight:900;color:rgba(255,255,255,.55);white-space:nowrap}
      .kavr-lane{position:relative;z-index:1;height:min(11.5vh,96px);min-height:66px;border-bottom:1px solid rgba(255,255,255,.08)}.kavr-lane:last-child{border-bottom:0}.kavr-lane.is-me{background:linear-gradient(90deg,rgba(120,232,255,.06),transparent)}.kavr-lane-rank{position:absolute;left:-25px;top:50%;transform:translateY(-50%);font-size:10px;font-weight:950}.kavr-runner{position:absolute;top:50%;display:flex;align-items:center;gap:4px;transform:translate(-28%,-50%);transition:left .65s cubic-bezier(.2,.85,.25,1);white-space:nowrap}.kavr-runner img{width:clamp(74px,10.8vh,118px);height:clamp(74px,10.8vh,118px);object-fit:contain;filter:drop-shadow(0 7px 12px rgba(0,0,0,.38))}.kavr-runner>span{display:grid;gap:1px;border-radius:10px;background:rgba(2,8,20,.78);padding:4px 7px;font-size:9px;font-weight:900}.kavr-runner small{font-size:7px;color:#ffd76d}.kavr-distance{position:absolute;right:7%;top:50%;transform:translateY(-50%);font-size:10px;font-weight:900;color:white;text-shadow:0 2px 5px #000}
      @media(max-width:850px){.kavr-topbar{padding-top:5px;gap:5px;font-size:9px}.kavr-score{padding:4px 7px}.kavr-score strong{font-size:10px}.kavr-time{padding:4px 7px}.kavr-question-row{padding:5px 8px;gap:6px}.kavr-question{padding:8px;border-radius:12px}.kavr-question h2{font-size:13px}.kavr-feedback{font-size:10px;padding:5px 7px}.kavr-options{gap:5px}.kavr-options button{min-height:47px;padding:5px 7px;border-radius:10px}.kavr-options strong{width:22px;height:22px;font-size:10px}.kavr-options span{font-size:10px}.kavr-track-wrap{padding:0 8px 7px}.kavr-track{padding-top:16px;padding-bottom:4px;border-radius:13px}.kavr-marker span{font-size:6px}.kavr-marker i{top:13px}.kavr-lane{height:min(9.2vh,62px);min-height:46px}.kavr-runner img{width:58px;height:58px}.kavr-runner>span{font-size:7px;padding:3px 5px}.kavr-runner small{font-size:6px}.kavr-distance{font-size:8px}}
    `}</style>
  </div>;
}
