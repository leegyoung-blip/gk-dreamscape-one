import { NextResponse } from "next/server";
import { authorizedAdmin, safeError } from "@/lib/founding-50/server";
import { deliverF50RewardGrant } from "@/lib/founding-50/rewards";
export const runtime = "nodejs";
export async function POST(request: Request,{params}:{params:Promise<{id:string}>}) {
 try {
  if(!(await authorizedAdmin(request)))return NextResponse.json({error:"Forbidden"},{status:403});
  const {id}=await params;
  const result=await deliverF50RewardGrant(id);
  return NextResponse.json({ok:true,...result});
 }catch(e){safeError(e,"Reward delivery failed");return NextResponse.json({error:"Delivery unavailable; check reward adapter configuration"},{status:503});}
}
