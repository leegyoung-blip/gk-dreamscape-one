"use client";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const shell: CSSProperties = { minHeight:"100vh", padding:"max(7vh,32px) 20px", background:"radial-gradient(circle at 35% 15%,rgba(83,215,255,.16),transparent 32%),radial-gradient(circle at 70% 0%,rgba(197,140,255,.14),transparent 30%),#020813", color:"white", fontFamily:"Arial,Helvetica,sans-serif" };
const btn: CSSProperties = {border:"none",background:"linear-gradient(90deg,#8ee8ff,#c58cff)",color:"#100622",padding:"15px 25px",borderRadius:99,cursor:"pointer",fontWeight:900,fontSize:12,letterSpacing:".08em"};
export default function Founding50ActivationPage(){
 const [token,setToken]=useState(""); const [loggedIn,setLoggedIn]=useState(false);
 const [state,setState]=useState<"idle"|"busy"|"success"|"error">("idle");const [msg,setMsg]=useState("");
 useEffect(()=>{setToken(new URLSearchParams(window.location.search).get("token")||"");
   void supabase.auth.getSession().then(({data})=>setLoggedIn(Boolean(data.session?.access_token)));
 },[]);
 async function activate(){setState("busy");try{
  const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error("Please sign in first.");
  const res=await fetch("/api/founding-50/activate",{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({token})});
  const body=await res.json();if(!res.ok)throw new Error(body?.error||"Unable to activate");
  setState("success");setMsg(`Access activated until ${new Date(body.endsAt).toLocaleDateString()}.`);
  window.history.replaceState({},"","/founding-50/activate");
 }catch(e){setState("error");setMsg(e instanceof Error?e.message:"Activation failed");}}
 return <main style={shell}><div style={{maxWidth:700,margin:"0 auto",padding:"clamp(24px,5vw,48px)",border:"1px solid rgba(142,232,255,.25)",borderRadius:32,background:"linear-gradient(145deg,rgba(5,17,34,.97),rgba(16,10,35,.97))",boxShadow:"0 25px 90px rgba(0,0,0,.4)"}}>
  <p style={{fontSize:12,color:"#8ee8ff",letterSpacing:".2em",fontWeight:900}}>✦ DREAMSCAPE · FOUNDING 50</p>
  <h1 style={{font:"normal clamp(32px,5vw,54px) Georgia,serif",lineHeight:1.08}}>Your Nova adventure begins here.</h1>
  <p style={{color:"#cdd8e8",lineHeight:1.8}}>Sign in with the same parent email address used for your application, then activate your 30-day NOVA+ invitation. No payment required.</p>
  {!token && state!=="success" && <p style={{color:"#ffcbaf"}}>No invitation token was found. Use the button in your invitation email.</p>}
  {state==="success"?<><p style={{color:"#a4f0dc"}}>{msg}</p><Link href="/founding-50/benefits" style={{...btn,display:"inline-block",textDecoration:"none"}}>View My Founding Benefits →</Link></>:
   <>{!loggedIn&&<div style={{margin:"20px 0"}}><Link href="/login" style={{color:"#8ee8ff",fontWeight:800}}>Sign in or create your account →</Link><p style={{fontSize:13,color:"#a7b7ca"}}>After signing in, return to this invitation page to activate.</p></div>}
   {state==="error"&&<p role="alert" style={{color:"#ffcbaf"}}>{msg}</p>}
   <button type="button" style={{...btn,opacity:!token||state==="busy"?.6:1}} disabled={!token||state==="busy"} onClick={()=>void activate()}>{state==="busy"?"ACTIVATING…":"ACTIVATE 30 DAYS OF ACCESS →"}</button></>}
 </div></main>;
}
