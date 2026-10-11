"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
type Status={application:{student_name:string;beta_starts_at:string;beta_ends_at:string;survey_completed_at:string|null}|null;badge:{earned_at:string}|null;reward:{status:string;dream_tokens:number;dream_gems:number}|null;discount:{state:string;promo_code:string|null;redeem_by:string|null}|null;surveyAvailable:boolean;discountEligible:boolean;betaActive:boolean};
export default function Founding50Benefits(){
 const [status,setStatus]=useState<Status|null>(null);const [message,setMessage]=useState("");const [issuing,setIssuing]=useState(false);
 async function token(){const {data:{session}}=await supabase.auth.getSession();if(!session)throw Error("Please sign in with your parent account.");return session.access_token;}
 async function reload(){try{const r=await fetch("/api/founding-50/me",{headers:{Authorization:`Bearer ${await token()}`}});const d=await r.json();if(!r.ok)throw Error(d.error);setStatus(d);}catch(e){setMessage(e instanceof Error?e.message:"Could not load benefits");}}
 useEffect(()=>{void reload()},[]);
 async function claim(){setIssuing(true);setMessage("");try{const r=await fetch("/api/founding-50/discount",{method:"POST",headers:{Authorization:`Bearer ${await token()}`}});const d=await r.json();if(!r.ok)throw Error(d.error);await reload();}catch(e){setMessage(e instanceof Error?e.message:"Code unavailable") }finally{setIssuing(false)}}
 return <main style={{background:"radial-gradient(circle at 20% 0%,rgba(83,215,255,.15),transparent 27%),radial-gradient(circle at 90% 20%,rgba(197,140,255,.15),transparent 28%),#020813",minHeight:"100vh",padding:"48px 18px",color:"white",fontFamily:"Arial,sans-serif"}}><div style={{maxWidth:860,margin:"0 auto"}}><p style={{fontSize:11,letterSpacing:".2em",color:"#8ee8ff",fontWeight:900}}>✦ DREAMSCAPE · FOUNDING 50</p><h1 style={{font:"normal clamp(37px,5vw,58px) Georgia,serif",lineHeight:1.1}}>Founding benefits.</h1>
 {!status?<p style={{color:"#b7c5da"}}>Loading account benefits…</p>:!status.application?<p>No activated beta account was found. Use your invitation email to activate access.</p>:<>
 <p style={{color:"#cdd9eb",lineHeight:1.7}}>Welcome, {status.application.student_name}. Your 30-day beta ends {new Date(status.application.beta_ends_at).toLocaleDateString()}.</p>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(245px,1fr))",gap:18,marginTop:26}}>
  <div style={{padding:23,border:"1px solid #2a405c",borderRadius:26,background:"rgba(255,255,255,.04)"}}><img src="/badges/founding-50-placeholder.svg" alt="Founding 50 badge placeholder" width={128} height={128} style={{display:"block",margin:"0 auto"}} /><h2 style={{fontSize:21}}>Founding 50 Badge</h2><p style={{color:"#adbbcd"}}>Earned on activation · Artwork placeholder</p></div>
  <div style={{padding:23,border:"1px solid #2a405c",borderRadius:26,background:"rgba(255,255,255,.04)"}}><h2 style={{fontSize:21}}>Founder's Reward Pack</h2><p style={{fontWeight:900,color:"#8ee8ff",fontSize:24}}>500 DT + 20 DG</p><p style={{color:"#adbbcd"}}>Delivery: {status.reward?.status||"pending"}. Credits appear in your actual wallet after the rewards adapter confirms delivery.</p></div>
  <div style={{padding:23,border:"1px solid #2a405c",borderRadius:26,background:"rgba(255,255,255,.04)"}}><h2 style={{fontSize:21}}>30% Off NOVA+</h2><p style={{color:"#adbbcd"}}>First six monthly subscription months after launch. Complete your 30-day beta and feedback survey.</p>
   {status.discount?.state==="issued"&&status.discount.promo_code?<><p style={{color:"#8ee8ff",fontWeight:900,wordBreak:"break-all"}}>{status.discount.promo_code}</p><button onClick={()=>void navigator.clipboard.writeText(status.discount?.promo_code||"")} style={{background:"transparent",border:"1px solid #8ee8ff",borderRadius:99,padding:"10px 16px",color:"#8ee8ff",cursor:"pointer"}}>Copy code</button></>:status.discountEligible?<button disabled={issuing} onClick={()=>void claim()} style={{padding:"12px 20px",border:0,borderRadius:99,background:"linear-gradient(90deg,#8ee8ff,#c58cff)",color:"#100622",fontWeight:900,cursor:"pointer"}}>{issuing?"ISSUING…":"CLAIM DISCOUNT →"}</button>:<p style={{fontSize:13,color:"#ffca86"}}>Not yet unlocked</p>}
  </div>
 </div>
 {status.surveyAvailable&&!status.application.survey_completed_at&&<p style={{marginTop:24}}><Link href="/founding-50/feedback" style={{color:"#8ee8ff",fontWeight:800}}>Complete your final-week feedback survey →</Link></p>}
 </>}
 {message&&<p role="alert" style={{color:"#ffcbaf"}}>{message}</p>}
 </div></main>
}
