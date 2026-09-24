"use client";

import type { CSSProperties, ReactNode } from "react";
import type { ActivityLabBatteryState } from "@/lib/activity-lab/battery";

type Props = {
  mobile: boolean; userId: string; open: boolean; onOpen: () => void; onClose: () => void; onAddTime: () => void;
  remainingSeconds: number; baseBatterySeconds: number; bonusSeconds: number; capacitySeconds: number; percentage: number;
  status: string; error: string | null; state: ActivityLabBatteryState | null; isDraining: boolean; ownsDrainSession: boolean;
  activeGameplay: boolean; minimumStartSeconds?: number;
};

function formatTime(seconds: number) { const safe=Math.max(0,Math.floor(seconds)); return `${Math.floor(safe/60)}:${String(safe%60).padStart(2,"0")}`; }
function eta(seconds:number){const s=Math.max(0,Math.ceil(seconds));const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return h?`${h}h ${m}m`:m?`${m}m ${s%60}s`:`${s}s`;}
function accent(p:number){return p<=5?"#ff7187":p<=20?"#ffb65e":p<=40?"#ffd66f":"#7ce8ff";}

export default function ActivityLabBatteryMeter(props: Props) {
  const {mobile,userId,open,onOpen,onClose,onAddTime,remainingSeconds,baseBatterySeconds,bonusSeconds,capacitySeconds,percentage,status,error,state,isDraining,ownsDrainSession,activeGameplay,minimumStartSeconds=60}=props;
  const colour=accent(percentage); const external=Boolean(state?.isDraining&&!ownsDrainSession); const rate=state?.rechargeRealSecondsPerBatterySecond??10;
  const readyEta=Math.max(0,minimumStartSeconds-remainingSeconds)*rate; const fullEta=Math.max(0,capacitySeconds-baseBatterySeconds)*rate;
  const button:CSSProperties={minHeight:mobile?36:40,minWidth:mobile?96:164,padding:mobile?"0 10px":"0 13px",borderRadius:999,border:`1px solid ${colour}55`,background:"rgba(4,14,31,.78)",color:"white",display:"grid",gridTemplateColumns:"auto minmax(0,1fr)",gap:8,alignItems:"center",cursor:"pointer"};
  return <>
    <button type="button" onClick={onOpen} style={button} aria-label="Open Activity Lab battery">
      <span style={{color:colour,fontSize:mobile?14:16}}>⚡</span><span style={{minWidth:0,textAlign:"left"}}>
        {!mobile&&<span style={{display:"block",color:"rgba(255,255,255,.46)",fontSize:7,fontWeight:900,letterSpacing:".08em"}}>LAB BATTERY</span>}
        <span style={{display:"flex",alignItems:"center",gap:7}}><strong style={{fontSize:mobile?9:11,whiteSpace:"nowrap"}}>{userId?formatTime(remainingSeconds):"Guest"}</strong>{!mobile&&bonusSeconds>0&&<span style={{fontSize:7,color:"#9fffd2",fontWeight:900}}>+{Math.floor(bonusSeconds/60)}m bonus</span>}</span>
      </span>
    </button>
    {open&&<div onClick={onClose} style={{position:"fixed",inset:0,zIndex:250,display:"grid",placeItems:"center",padding:16,background:"rgba(0,4,12,.78)",backdropFilter:"blur(9px)"}}>
      <section onClick={e=>e.stopPropagation()} style={{width:"min(570px,100%)",borderRadius:24,border:"1px solid rgba(126,232,255,.2)",background:"linear-gradient(145deg,rgba(7,25,45,.98),rgba(3,9,24,.99))",boxShadow:"0 30px 90px rgba(0,0,0,.5)",padding:mobile?18:24,color:"white"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}><div><p style={{margin:0,color:colour,fontSize:9,fontWeight:950,letterSpacing:".16em"}}>ACTIVITY LAB BATTERY</p><h2 style={{margin:"6px 0 0",fontFamily:'Georgia, "Times New Roman", serif',fontSize:mobile?28:36,fontWeight:400}}>{userId?formatTime(remainingSeconds):"Guest play"}</h2></div><button type="button" onClick={onClose} style={{width:38,height:38,borderRadius:999,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.05)",color:"white",fontSize:20,cursor:"pointer"}}>×</button></div>
        {!userId?<p style={{margin:"15px 0 0",color:"rgba(255,255,255,.58)",fontSize:12,lineHeight:1.55}}>Guests can preview games. Log in to use the rechargeable battery, Play Credits, and DT rewards.</p>:status==="loading"?<p style={{margin:"15px 0 0",color:"rgba(255,255,255,.58)",fontSize:12}}>Loading your battery…</p>:error?<p style={{margin:"15px 0 0",color:"#ff9ca7",fontSize:12}}>{error}</p>:<>
          <div style={{marginTop:16,height:14,borderRadius:999,background:"rgba(255,255,255,.07)",padding:2,overflow:"hidden"}}><div style={{width:`${Math.max(0,Math.min(100,percentage))}%`,height:"100%",borderRadius:999,background:`linear-gradient(90deg,${colour},#9fffd2)`,transition:"width .35s ease"}}/></div>
          <div style={{marginTop:7,display:"flex",justifyContent:"space-between",gap:10,color:"rgba(255,255,255,.42)",fontSize:9,fontWeight:800}}><span>Renewable {formatTime(baseBatterySeconds)} / {formatTime(capacitySeconds)}</span><span>{bonusSeconds>0?`Bonus ${formatTime(bonusSeconds)}`:"No bonus time"}</span></div>
          <div style={{marginTop:16,display:"grid",gap:8}}>
            {external?<Info colour="#ffd08a" title="Battery is in use elsewhere">Another Activity Lab tab or device currently owns the battery session.</Info>:activeGameplay&&remainingSeconds<=0?<Info colour="#ff9ca7" title="Battery depleted — finish this run">Your current run is protected. Recharge begins when gameplay stops.</Info>:isDraining?<Info colour="#9feeff" title="Battery is draining">Renewable time is used first. Purchased bonus time is used only after renewable time reaches zero.</Info>:remainingSeconds<minimumStartSeconds?<Info colour="#ffd66f" title="Recharging">A new run needs at least 1:00. Renewable battery reaches that in about {eta(readyEta)} — or add Play Credits now.</Info>:<Info colour="#84efb2" title="Ready to play">Battery recharges whenever no Activity Lab game is actively running.</Info>}
          </div>
          {!isDraining&&baseBatterySeconds<capacitySeconds&&<div style={{marginTop:12,display:"flex",justifyContent:"space-between",gap:12,color:"rgba(255,255,255,.42)",fontSize:9}}><span>Renewable: +1 min every 10 min</span><span>Base full in ~{eta(fullEta)}</span></div>}
          <button type="button" onClick={onAddTime} style={{width:"100%",minHeight:44,marginTop:17,borderRadius:13,border:"1px solid rgba(255,209,106,.32)",background:"linear-gradient(135deg,#ffd16a,#f5a73f)",color:"#211300",fontSize:11,fontWeight:950,cursor:"pointer"}}>+ Add Play Time</button>
          <p style={{margin:"9px 0 0",color:"rgba(255,255,255,.3)",fontSize:8.5,textAlign:"center"}}>1 Play Credit = 1 minute of purchased bonus playtime.</p>
        </>}
      </section>
    </div>}
  </>;
}

function Info({colour,title,children}:{colour:string;title:string;children:ReactNode}){return <div style={{borderRadius:14,border:`1px solid ${colour}33`,background:`${colour}0d`,padding:11}}><strong style={{fontSize:11,color:colour}}>{title}</strong><p style={{margin:"4px 0 0",color:"rgba(255,255,255,.5)",fontSize:10,lineHeight:1.45}}>{children}</p></div>}
