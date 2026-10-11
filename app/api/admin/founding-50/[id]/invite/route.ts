import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { adminDb, authorizedAdmin, safeError } from "@/lib/founding-50/server";
import { sendF50Email } from "@/lib/founding-50/email";
export const runtime = "nodejs";

export async function POST(request: Request, {params}:{params:Promise<{id:string}>}) {
  try {
    if(!(await authorizedAdmin(request))) return NextResponse.json({error:"Forbidden"},{status:403});
    const {id}=await params;
    const origin=process.env.FOUNDING50_PUBLIC_ORIGIN;
    if(!origin || !/^https:\/\//.test(origin)) return NextResponse.json({error:"Invitation origin is not configured"},{status:503});
    const token=randomBytes(32).toString("base64url");
    const hash=createHash("sha256").update(token).digest("hex");
    const expiry=new Date(Date.now()+7*24*60*60*1000);
    const db=adminDb();
    const {data,error}=await db.rpc("f50_prepare_invite",{p_id:id,p_hash:hash,p_expires:expiry.toISOString()});
    if(error) return NextResponse.json({error:"Cannot reserve a beta seat. Check approval status and available invitations."},{status:409});
    const app=data?.[0];
    if(!app) return NextResponse.json({error:"Application unavailable"},{status:404});
    const activationUrl=`${origin.replace(/\/$/,"")}/founding-50/activate?token=${encodeURIComponent(token)}`;
    try {
      await sendF50Email({
        to:app.parent_email, subject:"You're invited — Dreamscape Founding 50",
        heading:"Your family has been selected.",
        body:`We are delighted to invite your family to the Founding 50 beta for ${app.student_name}. This invitation expires in seven days. Sign in or create a Dreamscape account using the same email address to activate 30 days of complimentary NOVA+ access. No payment required.`,
        actionUrl:activationUrl,actionLabel:"Activate beta access →",
      });
    } catch(emailError) {
      // Token becomes invalid immediately if delivery fails. Admin may resend safely.
      await db.from("founding_50_applications").update({status:"approved",invite_token_hash:null,invite_expires_at:null}).eq("id",id).eq("invite_token_hash",hash);
      safeError(emailError,"Invitation email failed");
      return NextResponse.json({error:"Invitation could not be delivered. Retry after checking Resend settings."},{status:502});
    }
    return NextResponse.json({ok:true,expiresAt:expiry.toISOString()});
  } catch(e){safeError(e,"Invitation failed");return NextResponse.json({error:"Unable to send invitation"},{status:500});}
}
