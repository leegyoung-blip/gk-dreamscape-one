"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

type ApplicantStatus = "pending" | "approved" | "invited" | "activated" | "waitlisted" | "declined";
type Application = {
  id:string; parent_email:string;student_name:string;student_age:number;
  status:ApplicantStatus; created_at:string;admin_notes:string|null;
  invited_at:string|null;invite_sent_at:string|null;invite_delivery_status:string|null;
  invite_expires_at:string|null;invite_expired_at:string|null;activated_at:string|null;
  beta_starts_at:string|null;beta_ends_at:string|null;survey_completed_at:string|null;
};
type Mail = {
  id:string;kind:string;generation:number;status:string;attempts:number;
  created_at:string;sent_at:string|null;next_attempt_at:string|null;
  last_error:string|null;provider_message_id:string|null;
};
type SeatCounts={activated_count:number;reserved_count:number;available_count:number};
const filters=["all","pending","invited","activated","approved","waitlisted","declined"];
const actions={waitlisted:"Waitlist",declined:"Decline",pending:"Back to Pending",approved:"Mark Approved"} as const;

export default function Founding50AdminPage(){
  const [filter,setFilter]=useState("all");
  const [query,setQuery]=useState("");
  const [applications,setApplications]=useState<Application[]>([]);
  const [seats,setSeats]=useState<SeatCounts>({activated_count:0,reserved_count:0,available_count:50});
  const [isLoading,setIsLoading]=useState(true);
  const [busyId,setBusyId]=useState<string|null>(null);
  const [expandedId,setExpandedId]=useState<string|null>(null);
  const [mailByApp,setMailByApp]=useState<Record<string,Mail[]>>({});
  const [notes,setNotes]=useState<Record<string,string>>({});
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [forbidden,setForbidden]=useState(false);

  const authHeaders=useCallback(async()=>{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session?.access_token)throw new Error("Sign in using an authorised Dreamscape admin account.");
    return {Authorization:`Bearer ${session.access_token}`};
  },[]);

  const load=useCallback(async(nextFilter:string)=>{
    setIsLoading(true);setError("");
    try{
      const r=await fetch(`/api/admin/founding-50?status=${encodeURIComponent(nextFilter)}`,{
        cache:"no-store",headers:await authHeaders(),
      });
      const json=await r.json().catch(()=>({}));
      if(!r.ok){setForbidden(r.status===403);throw new Error(json.error||"Unable to load applications.");}
      setForbidden(false);setApplications(json.applications||[]);
      setSeats(json.seats||{activated_count:0,reserved_count:0,available_count:50});
    }catch(e){setError(e instanceof Error?e.message:"Unable to load applications.");}
    finally{setIsLoading(false);}
  },[authHeaders]);
  useEffect(()=>{void load(filter);},[filter,load]);

  const visible=useMemo(()=>applications.filter(a=>
    `${a.student_name} ${a.parent_email}`.toLowerCase().includes(query.trim().toLowerCase())
  ),[applications,query]);
  const occupied=Number(seats.activated_count)+Number(seats.reserved_count);
  const activatedVisible=applications.filter(a=>a.status==="activated");
  const surveyedVisible=activatedVisible.filter(a=>Boolean(a.survey_completed_at)).length;
  const finalWeekVisible=activatedVisible.filter(a=>
    a.beta_starts_at && a.beta_ends_at && !a.survey_completed_at &&
    Date.now()>=Date.parse(a.beta_starts_at)+23*86_400_000 &&
    Date.now()<Date.parse(a.beta_ends_at)
  ).length;

  async function submit(id:string,uri:string,method:"POST"|"PATCH",body?:Record<string,unknown>){
    setBusyId(id);setMessage("");setError("");
    try{
      const r=await fetch(uri,{method,headers:{...(await authHeaders()),...(body?{"Content-Type":"application/json"}:{})},
        ...(body?{body:JSON.stringify(body)}:{})});
      const json=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(json.error||"Unable to save changes.");
      await load(filter);
      if(uri.endsWith("/invite"))setMessage(json.delivery?.sent
        ?"Seat reserved. Resend accepted the invitation email."
        :"Seat reserved. Invitation queued for automatic delivery/retry.");
      else if(uri.endsWith("/rewards"))setMessage(json.status==="pending"
        ? "Reward grant is still pending: configure the Phase 1C wallet adapter to credit DT/DG."
        : "Reward delivery request processed; verify the real wallet ledger before confirming credit.");
      else setMessage("Application updated.");
      return true;
    }catch(e){setError(e instanceof Error?e.message:"Unable to complete this action.");return false;}
    finally{setBusyId(null);}
  }

  async function approveInvite(id:string){
    if(!window.confirm("Reserve one Founding 50 place and email an invitation to this parent?"))return;
    await submit(id,`/api/admin/founding-50/${id}/invite`,"POST");
  }

  async function review(a:Application,target:keyof typeof actions){
    if(target==="declined"&&!window.confirm("Decline this application and queue an outcome email?"))return;
    await submit(a.id,`/api/admin/founding-50/${a.id}`,"PATCH",{status:target,
      adminNotes:notes[a.id]??a.admin_notes??""});
  }

  async function saveNotes(a:Application){
    await submit(a.id,`/api/admin/founding-50/${a.id}`,"PATCH",{adminNotes:notes[a.id]??a.admin_notes??""});
  }

  async function loadMail(id:string){
    try{
      const r=await fetch(`/api/admin/founding-50/${id}/emails`,{headers:await authHeaders(),cache:"no-store"});
      const json=await r.json();
      if(!r.ok)throw new Error(json.error||"Unable to load email history.");
      setMailByApp(current=>({...current,[id]:json.messages||[]}));
    }catch(e){setError(e instanceof Error?e.message:"Email history unavailable.");}
  }

  async function toggle(a:Application){
    const next=expandedId===a.id?null:a.id;
    setExpandedId(next);
    if(next)await loadMail(next);
  }

  async function retryMail(a:Application,m:Mail){
    if(m.status!=="failed")return;
    setBusyId(a.id);setError("");setMessage("");
    try{
      const r=await fetch(`/api/admin/founding-50/${a.id}/emails`,{
        method:"POST",headers:{...(await authHeaders()),"Content-Type":"application/json"},
        body:JSON.stringify({mailId:m.id}),
      });
      const json=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(json.error||"Email retry failed.");
      setMessage("Retry requested. Check the updated email history for its result.");
      await loadMail(a.id);
    }catch(e){setError(e instanceof Error?e.message:"Could not retry email.");}
    finally{setBusyId(null);}
  }

  async function deliverRewards(a:Application){
    await submit(a.id,`/api/admin/founding-50/${a.id}/rewards`,"POST");
  }

  return <main style={{minHeight:"100vh",padding:"36px clamp(16px,4vw,60px) 70px",
    background:"radial-gradient(circle at 14% 0%,rgba(83,215,255,.12),transparent 28%),radial-gradient(circle at 94% 0%,rgba(197,140,255,.14),transparent 29%),#020813",
    color:"white",fontFamily:"Arial,Helvetica,sans-serif"}}>
    <div style={{maxWidth:1440,margin:"0 auto"}}>
      <p style={{color:"#8ee8ff",fontWeight:900,letterSpacing:".18em",fontSize:11,margin:0}}>DREAMSCAPE · FOUNDING 50</p>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"end",gap:16,flexWrap:"wrap",marginTop:12}}>
        <div>
          <h1 style={{fontFamily:'Georgia,"Times New Roman",serif',fontWeight:400,fontSize:"clamp(35px,4.4vw,56px)",margin:0}}>Applications & Invitations</h1>
          <p style={{color:"#a8b5c8",maxWidth:760,lineHeight:1.6}}>One student per family · Manual selection · Seven-day invitations · Automatic follow-ups</p>
        </div>
        <button onClick={()=>void load(filter)} type="button" style={outlineBtn}>Refresh</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))",gap:13,marginTop:25}}>
        <Stat label="Activated" number={`${seats.activated_count}`} note="Permanent beta places"/>
        <Stat label="Reserved" number={`${seats.reserved_count}`} note="Unexpired invitations"/>
        <Stat label="Available" number={`${seats.available_count}`} note="Of 50 total places"/>
        <Stat label="Occupied" number={`${occupied}/50`} note="Activated + reserved"/>
        <Stat label="Surveys received" number={`${surveyedVisible}`} note="Among visible applications"/>
        <Stat label="Survey due" number={`${finalWeekVisible}`} note="In final week; not submitted"/>
      </div>
      <div style={{height:9,background:"rgba(255,255,255,.10)",borderRadius:999,marginTop:18,overflow:"hidden",display:"flex"}}>
        <div style={{width:`${Number(seats.activated_count)*2}%`,background:"#8ee8ff"}}/>
        <div style={{width:`${Number(seats.reserved_count)*2}%`,background:"#bca0ff"}}/>
      </div>
      <p style={{fontSize:12,color:"#9cabc2",marginTop:10}}>An invitation reserves a seat immediately. Expired invites release seats; waiting applicants are never promoted automatically.</p>
      <div style={{display:"flex",gap:9,flexWrap:"wrap",alignItems:"center",marginTop:24}}>
        {filters.map(f=><button key={f} type="button" onClick={()=>setFilter(f)} style={{...outlineBtn,
          background:filter===f?"linear-gradient(90deg,#8ee8ff,#c58cff)":"rgba(255,255,255,.04)",
          color:filter===f?"#100622":"white",border:filter===f?"none":outlineBtn.border,
        }}>{f.toUpperCase()}</button>)}
        <input aria-label="Search applicants" value={query} onChange={e=>setQuery(e.target.value)}
          placeholder="Search student or email" style={{...inputStyle,maxWidth:280,marginLeft:"auto"}}/>
      </div>
      {message&&<p role="status" style={{padding:14,background:"rgba(142,232,255,.09)",border:"1px solid rgba(142,232,255,.24)",borderRadius:16,color:"#aceafe"}}>{message}</p>}
      {error&&<p role="alert" style={{padding:14,background:"rgba(255,157,124,.09)",border:"1px solid rgba(255,157,124,.28)",borderRadius:16,color:"#ffd2bf"}}>{error}</p>}
      {forbidden&&<p style={{color:"#ffbd73"}}>Access requires a verified Supabase account listed in founding_50_admin_users.</p>}
      <div style={{display:"grid",gap:15,marginTop:20}}>
        {isLoading?<Panel>Loading applications…</Panel>:visible.length===0?<Panel>No applications match these filters.</Panel>:visible.map(a=>{
          const busy=busyId===a.id;
          const activeInvite=a.status==="invited"&&!!a.invite_expires_at&&Date.parse(a.invite_expires_at)>Date.now();
          const mayInvite=["pending","approved","waitlisted"].includes(a.status);
          return <section key={a.id} style={panelStyle}>
            <div style={{display:"flex",justifyContent:"space-between",gap:15,flexWrap:"wrap",alignItems:"start"}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                  <span style={{background:"rgba(142,232,255,.10)",color:"#8ee8ff",fontSize:11,padding:"6px 10px",borderRadius:999,fontWeight:800}}>{a.status.toUpperCase()}</span>
                  {a.invite_expired_at&&a.status==="approved"&&<span style={{fontSize:11,color:"#ffd2a1"}}>PREVIOUS INVITATION EXPIRED</span>}
                  <span style={{fontSize:11,color:"#99a8bd"}}>{new Date(a.created_at).toLocaleString()}</span>
                </div>
                <h2 style={{margin:"12px 0 3px",fontSize:23}}>{a.student_name} <span style={{color:"#aebcd1",fontSize:15,fontWeight:400}}>Age {a.student_age}</span></h2>
                <p style={{margin:"8px 0",color:"#b6c3d4",fontSize:14,overflowWrap:"anywhere"}}>{a.parent_email}</p>
                {activeInvite&&<p style={{color:"#d1c1ff",fontSize:13,margin:"6px 0"}}>Invitation expires {new Date(a.invite_expires_at!).toLocaleString()} · Email: {a.invite_delivery_status||"queued"}</p>}
                {a.beta_ends_at&&<>
                  <p style={{color:"#9bdcf4",fontSize:13,margin:"6px 0"}}>Beta ends {new Date(a.beta_ends_at).toLocaleDateString()} · Feedback: {a.survey_completed_at?"Received":"Pending"}</p>
                  <p style={{color:"#c8b8f4",fontSize:12,margin:"6px 0"}}>Follow-up: {nextFollowupLabel(a)}</p>
                </>}
              </div>
              <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
                {mayInvite&&<button disabled={busy} onClick={()=>void approveInvite(a.id)} type="button" style={primaryBtn}>{busy?"Working…":"Approve & Invite →"}</button>}
                {["pending","approved","waitlisted","declined"].includes(a.status)&&<button disabled={busy} type="button" onClick={()=>void toggle(a)} style={outlineBtn}>{expandedId===a.id?"Hide details":"Review / Email history"}</button>}
                {["invited","activated"].includes(a.status)&&<button disabled={busy} type="button" onClick={()=>void toggle(a)} style={outlineBtn}>{expandedId===a.id?"Hide details":"Email history / Notes"}</button>}
              </div>
            </div>
            {expandedId===a.id&&<div style={{marginTop:21,paddingTop:20,borderTop:"1px solid rgba(255,255,255,.13)"}}>
              <label htmlFor={`notes-${a.id}`} style={{fontSize:12,fontWeight:800,color:"#b9c9db",letterSpacing:".06em"}}>ADMIN NOTES</label>
              <textarea id={`notes-${a.id}`} value={notes[a.id]??a.admin_notes??""} onChange={e=>setNotes(p=>({...p,[a.id]:e.target.value}))}
                rows={3} style={{...inputStyle,width:"100%",display:"block",resize:"vertical",marginTop:10,minHeight:90}} />
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:10}}>
                <button type="button" disabled={busy} style={outlineBtn} onClick={()=>void saveNotes(a)}>Save notes</button>
                {(["pending","approved","waitlisted","declined"] as ApplicantStatus[]).includes(a.status)&&
                  (Object.entries(actions) as [keyof typeof actions,string][]).filter(([target])=>target!==a.status).map(([target,label])=><button type="button" key={target} disabled={busy} style={outlineBtn} onClick={()=>void review(a,target)}>{label}</button>)}
                {a.status==="activated"&&<button type="button" disabled={busy} style={outlineBtn} onClick={()=>void deliverRewards(a)}>Retry pending rewards*</button>}
              </div>
              {a.status==="activated"&&<p style={{fontSize:11,color:"#91a1b9"}}>*Requires the Phase 1C wallet adapter; rewards are credited only once by the existing ledger integration.</p>}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginTop:24}}>
                <h3 style={{fontSize:15,margin:0}}>Email history</h3>
                <button type="button" onClick={()=>void loadMail(a.id)} style={outlineBtn}>Refresh history</button>
              </div>
              <div style={{display:"grid",gap:8,marginTop:12}}>
                {(mailByApp[a.id]||[]).length===0?<p style={{fontSize:13,color:"#a9b7c9"}}>No tracked messages yet.</p>:
                  (mailByApp[a.id]||[]).map(m=><div key={m.id} style={{background:"rgba(255,255,255,.035)",border:"1px solid rgba(255,255,255,.09)",borderRadius:13,padding:12,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                    <div><strong style={{fontSize:13}}>{m.kind.replaceAll("_"," ")}</strong>
                      <p style={{color:"#aab9cd",fontSize:11,margin:"5px 0"}}>{m.status==="sent"?"Accepted by Resend":m.status} · Attempts {m.attempts} · {new Date(m.created_at).toLocaleString()}</p>
                      {m.last_error&&<p style={{fontSize:11,color:"#ffbfaa",margin:"4px 0"}}>{m.last_error}</p>}
                    </div>
                    {m.status==="failed"&&<button type="button" disabled={busy} onClick={()=>void retryMail(a,m)} style={outlineBtn}>Retry email</button>}
                  </div>)}
              </div>
            </div>}
          </section>;
        })}
      </div>
    </div>
  </main>;
}
const outlineBtn:CSSProperties={minHeight:38,padding:"10px 15px",color:"white",border:"1px solid rgba(255,255,255,.2)",background:"rgba(255,255,255,.04)",fontSize:11,fontWeight:800,borderRadius:999,cursor:"pointer",letterSpacing:".04em"};
const primaryBtn:CSSProperties={...outlineBtn,background:"linear-gradient(90deg,#8ee8ff,#c58cff)",border:"none",color:"#160a2a"};
const panelStyle:CSSProperties={border:"1px solid rgba(142,232,255,.15)",borderRadius:24,background:"linear-gradient(140deg,rgba(8,24,45,.97),rgba(14,9,35,.97))",padding:"22px clamp(16px,2.5vw,28px)",boxShadow:"0 22px 55px rgba(0,0,0,.2)"};
const inputStyle:CSSProperties={padding:"12px 14px",minHeight:42,border:"1px solid rgba(255,255,255,.18)",borderRadius:14,background:"#17213a",color:"white",fontSize:14,boxSizing:"border-box"};
function Panel({children}:{children:ReactNode}){return <div style={panelStyle}>{children}</div>;}
function Stat({label,number,note}:{label:string;number:string;note:string}){return <div style={panelStyle}><p style={{fontSize:11,color:"#8ee8ff",fontWeight:800,letterSpacing:".11em",margin:0}}>{label.toUpperCase()}</p><p style={{fontSize:35,fontWeight:800,margin:"8px 0"}}>{number}</p><p style={{margin:0,color:"#9aabc0",fontSize:12}}>{note}</p></div>;}

function nextFollowupLabel(a:Application):string {
  if(a.status!=="activated"||!a.beta_starts_at||!a.beta_ends_at) return "Not activated";
  const start=Date.parse(a.beta_starts_at);
  const end=Date.parse(a.beta_ends_at);
  const now=Date.now();
  const day=86_400_000;
  if(now>=end) return a.survey_completed_at?"Beta completed · survey received":"Beta completed · survey outstanding";
  if(a.survey_completed_at) return "Feedback received · beta-end thank-you queued at expiry";
  if(now>=start+27*day) return "Final survey reminder due";
  if(now>=start+23*day) return "Final-week survey invitation due";
  if(now>=start+7*day) return "Day 7 check-in / later survey invitation";
  return "Welcome email / day 7 check-in";
}
