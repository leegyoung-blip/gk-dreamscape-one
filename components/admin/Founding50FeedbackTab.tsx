"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type Rating = "overall_experience" | "ease_of_use" | "child_engagement" | "learning_usefulness" | "reliability";
type Survey = {
  overall_experience:number; ease_of_use:number; child_engagement:number;
  learning_usefulness:number; reliability:number;
  favourite_feature:string|null; recommendation:string|null; suggestions:string|null;
};
type Row = {
  applicationId:string; studentName:string; parentEmail:string;
  betaStartsAt:string|null; betaEndsAt:string|null; submittedAt:string|null;
  eligibleToSurvey:boolean; feedbackStatus:"received"|"due"|"not_open";
  feedback:Survey|null; invitationStatus:string|null; reminderStatus:string|null;
  manualReminderCount:number; lastSurveyEmailAt:string|null;
  discountState:string; discountIssuedAt:string|null; discountRedeemBy:string|null;
};
type Summary = {
  activated:number;eligible:number;received:number;pending:number;responseRate:number;
  averages:Record<Rating, number|null>; features:Record<string,number>;
  recommendations:Record<string,number>;
};
type Report = {summary:Summary;rows:Row[]};
const ratingLabels:Record<Rating,string> = {
  overall_experience:"Overall experience",ease_of_use:"Ease of use",
  child_engagement:"Child engagement",learning_usefulness:"Learning usefulness",
  reliability:"Platform reliability",
};
const featureLabels:Record<string,string> = {
  mission_centre:"Mission Centre",think_lab:"Think Lab",knowledge_arena:"Knowledge Arena",
  skyforge_hangar:"Skyforge Hangar",nova_home:"Nova Home",not_explored:"Not explored enough",
};
const discountLabels:Record<string,string> = {
  issued:"Code issued",issuance_error:"Issuance needs review",issuing:"Code being prepared",
  survey_required:"Survey required",beta_in_progress:"Beta in progress",
  launch_not_configured:"Launch date not configured",awaiting_launch:"Awaiting public launch",
  redemption_window_expired:"Redemption window ended",eligible_to_claim:"Eligible to request code",
};
const outline:CSSProperties={border:"1px solid rgba(255,255,255,.22)",background:"rgba(255,255,255,.05)",color:"#F5F1FF",padding:"10px 14px",borderRadius:12,cursor:"pointer",fontSize:13,fontWeight:700};
const panel:CSSProperties={border:"1px solid rgba(195,162,255,.17)",background:"linear-gradient(140deg,#101B36,#17112E)",padding:20,borderRadius:19};
const muted:CSSProperties={color:"#ADBED1",fontSize:13};
const field:CSSProperties={background:"#17213A",border:"1px solid rgba(255,255,255,.2)",borderRadius:10,color:"white",padding:"11px 13px",minHeight:43,fontSize:14};

function fmt(date: string|null):string {
  if(!date)return "—";
  const parsed=new Date(date);
  return Number.isFinite(parsed.getTime())?new Intl.DateTimeFormat("en-SG",{timeZone:"Asia/Singapore",dateStyle:"medium"}).format(parsed):"—";
}
function Stat({label,value}:{label:string;value:string|number}){
  return <div style={panel}><p style={{fontSize:11,letterSpacing:1.1,color:"#C3AAFF",margin:"0 0 7px",fontWeight:800}}>{label.toUpperCase()}</p><p style={{fontSize:30,fontWeight:850,margin:0,color:"white"}}>{value}</p></div>;
}

export default function Founding50FeedbackTab(){
  const [report,setReport]=useState<Report|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [filter,setFilter]=useState("all");
  const [search,setSearch]=useState("");
  const [selected,setSelected]=useState<string|null>(null);
  const [working,setWorking]=useState<string|null>(null);

  const getHeaders=useCallback(async()=>{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session?.access_token)throw new Error("Sign in as a Dreamscape administrator.");
    return {Authorization:`Bearer ${session.access_token}`};
  },[]);
  const reload=useCallback(async()=>{
    setLoading(true);setError("");
    try{
      const r=await fetch("/api/admin/founding-50/feedback",{headers:await getHeaders(),cache:"no-store"});
      const payload=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(payload.error||"Unable to load feedback.");
      setReport(payload as Report);
    }catch(e){setError(e instanceof Error?e.message:"Unable to load feedback.");}
    finally{setLoading(false);}
  },[getHeaders]);
  useEffect(()=>{void reload();},[reload]);

  const rows=useMemo(()=>{
    const key=search.trim().toLowerCase();
    return (report?.rows||[]).filter(r=>(filter==="all"||r.feedbackStatus===filter)
      && `${r.studentName} ${r.parentEmail}`.toLowerCase().includes(key));
  },[report,search,filter]);
  const detail=useMemo(()=>report?.rows.find(r=>r.applicationId===selected)||null,[report,selected]);

  async function downloadCsv(){
    setError("");setWorking("export");
    try{
      const r=await fetch("/api/admin/founding-50/feedback?format=csv",{headers:await getHeaders(),cache:"no-store"});
      if(!r.ok)throw new Error("Unable to export CSV.");
      const blob=await r.blob();
      const objectUrl=URL.createObjectURL(blob);
      const link=document.createElement("a");link.href=objectUrl;
      link.download="founding-50-feedback.csv";
      document.body.appendChild(link);link.click();link.remove();
      URL.revokeObjectURL(objectUrl);
    }catch(e){setError(e instanceof Error?e.message:"CSV export failed.");}
    finally{setWorking(null);}
  }
  async function resend(r:Row){
    if(!window.confirm(`Queue one survey invitation for ${r.parentEmail}? This will be delivered by the existing communications cron.`))return;
    setError("");setNotice("");setWorking(r.applicationId);
    try{
      const response=await fetch("/api/admin/founding-50/feedback/remind",{
        method:"POST",headers:{...(await getHeaders()),"Content-Type":"application/json"},
        body:JSON.stringify({applicationId:r.applicationId}),
      });
      const json=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(json.error||"Unable to queue reminder.");
      setNotice(`Survey invitation queued for ${r.parentEmail}. The existing communications cron will deliver it.`);
      await reload();
    }catch(e){setError(e instanceof Error?e.message:"Could not queue reminder.");}
    finally{setWorking(null);}
  }
  const now=Date.now();
  return <div style={{marginTop:25,color:"white"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",flexWrap:"wrap",gap:12,marginBottom:18}}>
      <div><h2 style={{fontSize:27,margin:"0 0 8px",fontWeight:700}}>Family Feedback</h2>
        <p style={{...muted,margin:0}}>Survey participation, learning experience, parent comments and benefit status. Internal admin view.</p>
      </div>
      <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
        <button type="button" style={outline} onClick={()=>void reload()} disabled={loading}>Refresh</button>
        <button type="button" style={{...outline,background:"#6B48AB"}} onClick={()=>void downloadCsv()} disabled={working==="export"}>Export CSV</button>
      </div>
    </div>
    {error&&<p role="alert" style={{padding:12,borderRadius:12,color:"#FFD3C0",background:"#49263D"}}>{error}</p>}
    {notice&&<p role="status" style={{padding:12,borderRadius:12,color:"#BAF8EA",background:"#173E45"}}>{notice}</p>}
    {loading&&!report?<p style={muted}>Loading survey responses…</p>:!report?<p style={muted}>No report loaded.</p>:<>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
        <Stat label="Activated families" value={report.summary.activated}/>
        <Stat label="Survey eligible" value={report.summary.eligible}/>
        <Stat label="Responses" value={report.summary.received}/>
        <Stat label="Pending" value={report.summary.pending}/>
        <Stat label="Response rate" value={`${report.summary.responseRate}%`}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(270px,1fr))",gap:13,marginTop:15}}>
        <section style={panel} aria-label="Average ratings">
          <h3 style={{fontSize:17,margin:"0 0 16px"}}>Average Ratings</h3>
          {(Object.entries(ratingLabels) as [Rating,string][]).map(([key,label])=>{
            const score=report.summary.averages[key];
            return <div key={key} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}><span>{label}</span><strong>{score===null?"—":`${score.toFixed(2)}/5`}</strong></div>
              <div style={{height:8,borderRadius:99,background:"#29304B",overflow:"hidden"}}><div style={{height:"100%",borderRadius:99,width:`${(score||0)/5*100}%`,background:"#AE8BFA"}}/></div>
            </div>;
          })}
          <p style={muted}>Based on submitted feedback only.</p>
        </section>
        <section style={panel} aria-label="Favourite places">
          <h3 style={{fontSize:17,margin:"0 0 16px"}}>Favourite Nova Locations</h3>
          {Object.entries(featureLabels).map(([key,label])=>{
            const count=report.summary.features[key]||0;
            const max=Math.max(1,...Object.values(report.summary.features));
            return <div key={key} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}><span>{label}</span><strong>{count}</strong></div>
              <div style={{height:7,borderRadius:99,background:"#29304B",overflow:"hidden"}}><div style={{height:"100%",width:`${count/max*100}%`,background:"#6CD8E8"}}/></div>
            </div>;
          })}
          <p style={{...muted,marginTop:17}}>Would recommend: Yes {report.summary.recommendations.yes||0} · Maybe {report.summary.recommendations.maybe||0} · No {report.summary.recommendations.no||0}</p>
        </section>
      </div>
      <section style={{...panel,marginTop:15}}>
        <div style={{display:"flex",gap:11,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",marginBottom:15}}>
          <h3 style={{margin:0,fontSize:18}}>Individual Family Responses</h3>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <select aria-label="Filter survey status" style={field} value={filter} onChange={(e:{target:{value:string}})=>setFilter(e.target.value)}>
              <option value="all">All activated</option><option value="received">Submitted</option>
              <option value="due">Due / pending</option><option value="not_open">Not yet open</option>
            </select>
            <input aria-label="Search feedback" style={field} placeholder="Student or parent email" value={search} onChange={(e:{target:{value:string}})=>setSearch(e.target.value)} />
          </div>
        </div>
        {!rows.length?<p style={muted}>No families match this filter.</p>:<div style={{display:"grid",gap:9}}>
          {rows.map(r=>{
            const withinWindow=r.betaStartsAt&&r.betaEndsAt&&now>=Date.parse(r.betaStartsAt)+23*86400000&&now<Date.parse(r.betaEndsAt);
            const canRemind=r.feedbackStatus==="due"&&!!withinWindow&&r.manualReminderCount<2;
            return <article key={r.applicationId} style={{padding:14,border:"1px solid rgba(255,255,255,.13)",borderRadius:13,background:"rgba(255,255,255,.035)"}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
                <div style={{minWidth:200,flex:1}}>
                  <strong>{r.studentName}</strong><p style={{...muted,margin:"5px 0"}}>{r.parentEmail}</p>
                  <p style={{fontSize:12,color:r.feedback?"#9DF2D4":"#F1C58E",margin:0}}>
                    {r.feedback?`Feedback received ${fmt(r.submittedAt)}`:r.eligibleToSurvey?"Survey pending":"Not yet eligible"}
                    {" · "}Benefit: {discountLabels[r.discountState]||r.discountState}
                  </p>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button type="button" style={outline} onClick={()=>setSelected(selected===r.applicationId?null:r.applicationId)}>{selected===r.applicationId?"Hide details":"View details"}</button>
                  {canRemind&&<button type="button" style={{...outline,background:"#6B48AB"}} disabled={working===r.applicationId}
                    onClick={()=>void resend(r)}>{working===r.applicationId?"Queuing…":"Queue survey email"}</button>}
                </div>
              </div>
              {detail?.applicationId===r.applicationId&&<div style={{borderTop:"1px solid rgba(255,255,255,.12)",marginTop:14,paddingTop:14}}>
                <p style={muted}>Beta: {fmt(r.betaStartsAt)}–{fmt(r.betaEndsAt)} · Day 23: {r.invitationStatus||"not queued"} · Reminder: {r.reminderStatus||"not queued"}</p>
                <p style={muted}>Manual invitations used: {r.manualReminderCount}/2. Limited to the survey window and subject to a 48-hour sending cooldown.</p>
                {r.feedback?<>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:7,margin:"15px 0"}}>
                    {(Object.entries(ratingLabels) as [Rating,string][]).map(([k,label])=><span key={k} style={muted}>{label}: <strong style={{color:"white"}}>{r.feedback?.[k]}/5</strong></span>)}
                  </div>
                  <p style={muted}>Favourite: {featureLabels[r.feedback.favourite_feature||""]||"Not recorded"} · Recommend: {r.feedback.recommendation||"Not recorded"}</p>
                  <strong style={{fontSize:13}}>Suggestions</strong><p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",lineHeight:1.65,fontSize:14}}>{r.feedback.suggestions?.trim()||"No written suggestions"}</p>
                </>:<p style={muted}>No saved feedback response for this application.</p>}
                <p style={{...muted,fontSize:12}}>Discount: {discountLabels[r.discountState]||r.discountState} · Issued: {fmt(r.discountIssuedAt)} · Redemption deadline: {fmt(r.discountRedeemBy)}</p>
              </div>}
            </article>;
          })}
        </div>}
      </section>
      <p style={{...muted,marginTop:15}}>Discount eligibility is displayed for review only. This page never grants a promotion code, changes Stripe subscriptions or extends beta access. Survey exports contain family information; store them securely.</p>
    </>}
  </div>;
}
