"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
const prompts: [string,string][]=[
 ["ease","How easy was Dreamscape to use?"],
 ["engagement","How engaged was your child?"],
 ["learning","How useful were the learning activities?"],
 ["reliability","How reliable was the platform?"],
 ["overall","How would you rate the overall experience?"],
];
type Scores=Record<string,number>;
export default function Founding50Feedback(){
 const [scores,setScores]=useState<Scores>({}); const [suggestions,setSuggestions]=useState("");
 const [available,setAvailable]=useState<boolean|null>(null); const [done,setDone]=useState(false); const [saving,setSaving]=useState(false);const [msg,setMsg]=useState("");
 async function auth(){const {data:{session}}=await supabase.auth.getSession();if(!session)throw Error("Please sign in with the registered parent account.");return {Authorization:`Bearer ${session.access_token}`};}
 useEffect(()=>{void (async()=>{try{const r=await fetch("/api/founding-50/me",{headers:await auth()});const d=await r.json();if(!r.ok)throw Error(d.error);setAvailable(Boolean(d.surveyAvailable));setDone(Boolean(d.application?.survey_completed_at));}catch(e){setMsg(e instanceof Error?e.message:"Unable to load beta status");}})()},[]);
 async function submit(){setSaving(true);setMsg("");try{const r=await fetch("/api/founding-50/feedback",{method:"POST",headers:{...await auth(),"Content-Type":"application/json"},body:JSON.stringify({...scores,suggestions})});const d=await r.json();if(!r.ok)throw Error(d.error||"Unable to save survey");setDone(true);}catch(e){setMsg(e instanceof Error?e.message:"Could not submit feedback");}finally{setSaving(false)}}
 return <main style={{background:"radial-gradient(circle at 10% 0%,rgba(83,215,255,.14),transparent 30%),#020813",minHeight:"100vh",padding:"44px 18px",color:"white",fontFamily:"Arial,sans-serif"}}><div style={{maxWidth:720,margin:"auto",border:"1px solid #263c54",borderRadius:32,padding:"clamp(22px,4vw,44px)",background:"linear-gradient(145deg,#071626,#110c29)"}}>
  <p style={{fontSize:11,letterSpacing:".18em",color:"#8ee8ff",fontWeight:900}}>DREAMSCAPE · FOUNDING 50</p><h1 style={{font:"normal clamp(34px,5vw,48px) Georgia,serif"}}>Your feedback helps shape the adventure.</h1>
  {done?<><p style={{lineHeight:1.7,color:"#b4f6dc"}}>Thank you. Your survey has been received.</p><Link style={{color:"#8ee8ff"}} href="/founding-50/benefits">View your benefits →</Link></>:
   available===false?<p style={{color:"#b9c7dc",lineHeight:1.7}}>Your survey opens on day 23 of the beta. Return during your final week.</p>:
   available===null?<p style={{color:"#b9c7dc"}}>Checking access…</p>:<>
   <p style={{color:"#b9c7dc"}}>Please rate each statement from 1 (low) to 5 (high).</p>
   <div style={{display:"grid",gap:20,marginTop:24}}>{prompts.map(([k,label])=><fieldset key={k} style={{border:"1px solid #263c54",borderRadius:18,padding:16}}><legend style={{fontWeight:800,fontSize:14}}>{label}</legend><div style={{display:"flex",gap:12,flexWrap:"wrap"}}>{[1,2,3,4,5].map(n=><label key={n} style={{cursor:"pointer",padding:"8px 14px",borderRadius:30,background:scores[k]===n?"#8ee8ff":"#19273b",color:scores[k]===n?"#100622":"white"}}><input type="radio" name={k} value={n} checked={scores[k]===n} onChange={()=>setScores(v=>({...v,[k]:n}))} style={{marginRight:6}} />{n}</label>)}</div></fieldset>)}</div>
   <label style={{display:"block",marginTop:24,fontWeight:800,fontSize:14}}>Anything we should improve? (optional)</label>
   <textarea rows={4} maxLength={2000} value={suggestions} onChange={e=>setSuggestions(e.target.value)} style={{marginTop:8,width:"100%",boxSizing:"border-box",border:"1px solid #263c54",borderRadius:16,background:"#15213a",color:"white",padding:14,fontSize:15}} />
   <button type="button" disabled={saving||prompts.some(([k])=>!scores[k])} onClick={()=>void submit()} style={{marginTop:20,border:0,padding:"14px 22px",borderRadius:99,background:"linear-gradient(90deg,#8ee8ff,#c58cff)",fontWeight:900,color:"#100622",opacity:saving?.65:1,cursor:"pointer"}}>{saving?"SUBMITTING…":"SUBMIT FEEDBACK →"}</button></>}
  {msg&&<p role="alert" style={{color:"#ffcbaf"}}>{msg}</p>}
 </div></main>
}
