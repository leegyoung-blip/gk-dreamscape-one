import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { adminDb, authenticatedUser, safeError } from "@/lib/founding-50/server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const user=await authenticatedUser(request);
    if(!user?.email) return NextResponse.json({error:"Please sign in with a verified parent account"},{status:401});
    const body=await request.json();
    const token=typeof body?.token ==="string"?body.token:"";
    if(!/^[A-Za-z0-9_-]{35,90}$/.test(token)) return NextResponse.json({error:"Invalid invitation link"},{status:400});
    const hash=createHash("sha256").update(token).digest("hex");
    const {data,error}=await adminDb().rpc("f50_activate_invitation",{
      p_hash:hash,p_user_id:user.id,p_email:user.email,
    });
    if(error) return NextResponse.json({error:"The invitation is expired, already used, full, or belongs to another account."},{status:409});
    return NextResponse.json({ok:true,startsAt:data?.[0]?.starts_at,endsAt:data?.[0]?.ends_at});
  } catch(e){safeError(e,"Activation failed");return NextResponse.json({error:"Unable to activate invitation"},{status:500});}
}
