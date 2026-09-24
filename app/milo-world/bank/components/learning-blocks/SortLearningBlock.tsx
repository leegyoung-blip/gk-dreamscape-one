"use client";
import { useState } from "react";
import { evaluateSort } from "../../lib/financial-learning-engine";
import type { FinancialBlockResponse, SortBlock } from "../../lib/financial-learning-engine-types";
import LearningBlockShell from "./LearningBlockShell";

export default function SortLearningBlock({ block, response, onChange }: { block: SortBlock; response?: FinancialBlockResponse; onChange: (r: FinancialBlockResponse) => void }) {
  const values = (response?.value && typeof response.value === "object" ? response.value : {}) as Record<string,string>;
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const assign = (itemId: string, groupId: string) => {
    const next = { ...values, [itemId]: groupId };
    onChange({ blockId:block.id, blockType:block.type, value:next, isCorrect:evaluateSort(block,next), answeredAt:new Date().toISOString() });
    setSelectedItem(null);
  };
  const unassigned = block.items.filter((item) => !values[item.id]);
  const complete = block.items.every((item) => Boolean(values[item.id]));
  return <LearningBlockShell eyebrow={block.eyebrow ?? "Sort"} title={block.title}><h4 style={{margin:0,fontFamily:'Georgia, "Times New Roman", serif',fontSize:"27px",fontWeight:500}}>{block.prompt}</h4><div style={{marginTop:"15px",display:"flex",gap:"8px",flexWrap:"wrap"}}>{unassigned.map((item)=><button key={item.id} draggable onDragStart={(e: any)=>e.dataTransfer.setData("text/plain",item.id)} onClick={()=>setSelectedItem(item.id)} type="button" style={{borderRadius:"12px",border:selectedItem===item.id?"1px solid rgba(142,232,255,.48)":"1px solid rgba(255,255,255,.09)",background:selectedItem===item.id?"rgba(83,215,255,.08)":"rgba(255,255,255,.035)",color:"white",padding:"10px 12px",cursor:"grab",fontFamily:"inherit",fontSize:"11px"}}>{item.label}</button>)}</div><div style={{marginTop:"15px",display:"grid",gridTemplateColumns:`repeat(${Math.min(block.groups.length,3)},minmax(0,1fr))`,gap:"9px"}}>{block.groups.map((group)=><div key={group.id} onDragOver={(e: any)=>e.preventDefault()} onDrop={(e: any)=>{e.preventDefault();const itemId=e.dataTransfer.getData("text/plain");if(itemId)assign(itemId,group.id);}} onClick={()=>{if(selectedItem)assign(selectedItem,group.id);}} style={{minHeight:"130px",borderRadius:"15px",border:"1px dashed rgba(126,232,255,.24)",background:"rgba(83,215,255,.025)",padding:"12px",cursor:selectedItem?"pointer":"default"}}><strong style={{color:"#8ee8ff",fontSize:"12px"}}>{group.label}</strong>{group.description&&<div style={{marginTop:"3px",color:"rgba(255,255,255,.35)",fontSize:"9px"}}>{group.description}</div>}<div style={{marginTop:"10px",display:"grid",gap:"6px"}}>{block.items.filter((item)=>values[item.id]===group.id).map((item)=><button key={item.id} type="button" onClick={(e: any)=>{e.stopPropagation();const next={...values};delete next[item.id];onChange({blockId:block.id,blockType:block.type,value:next,answeredAt:new Date().toISOString()});}} style={{borderRadius:"10px",border:"1px solid rgba(255,255,255,.07)",background:"rgba(255,255,255,.045)",color:"white",padding:"8px",fontFamily:"inherit",fontSize:"10px",cursor:"pointer"}}>{item.label} ×</button>)}</div></div>)}</div>{complete&&block.explanation&&<div style={{marginTop:"13px",color:"rgba(255,255,255,.62)",fontSize:"11px",lineHeight:1.55}}>{block.explanation}</div>}</LearningBlockShell>;
}
