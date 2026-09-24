import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStripeClient, isStripeEnvironment, type DreamscapeStripeEnvironment } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Params = { params: Promise<{ environment: string }> };
function json(body:unknown,status=200){return NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}})}
function idOf(value:unknown){if(typeof value==="string")return value;if(value&&typeof value==="object"&&"id" in value)return String((value as {id?:unknown}).id||"");return "";}
function webhookSecret(environment:DreamscapeStripeEnvironment){const secret=environment==="production"?process.env.STRIPE_ACTIVITY_LAB_LIVE_WEBHOOK_SECRET:process.env.STRIPE_ACTIVITY_LAB_TEST_WEBHOOK_SECRET;if(!secret)throw new Error(`Missing Activity Lab Stripe ${environment} webhook secret.`);return secret;}

async function fulfil(session:Stripe.Checkout.Session,eventId:string){
  if(String(session.metadata?.dreamscape_kind||"")!=="activity_lab_credits") return false;
  if(session.payment_status!=="paid"&&session.payment_status!=="no_payment_required") return false;
  const orderId=String(session.metadata?.dreamscape_activity_credit_order_id||session.client_reference_id||"").trim();
  if(!orderId) throw new Error("Activity Lab credit order id missing from Stripe metadata.");
  const { data, error } = await supabaseAdmin.rpc("activity_lab_credit_apply_purchase", { p_order_id: orderId, p_provider_event_id: eventId, p_checkout_session_id: session.id, p_payment_intent_id: idOf(session.payment_intent) });
  if(error) throw error;
  return Boolean(data);
}

export async function POST(request:Request,{params}:Params){
  try{
    const {environment:raw}=await params;
    if(!isStripeEnvironment(raw)) return json({error:"Invalid Stripe environment."},400);
    const environment=raw as DreamscapeStripeEnvironment;
    const signature=request.headers.get("stripe-signature");
    if(!signature) return json({error:"Missing Stripe signature."},400);
    const rawBody=await request.text();
    const stripe=getStripeClient(environment);
    const event=stripe.webhooks.constructEvent(rawBody,signature,webhookSecret(environment));

    if(event.type==="checkout.session.completed"||event.type==="checkout.session.async_payment_succeeded"){
      await fulfil(event.data.object as Stripe.Checkout.Session,event.id);
    }else if(event.type==="checkout.session.expired"){
      const session=event.data.object as Stripe.Checkout.Session;
      if(String(session.metadata?.dreamscape_kind||"")==="activity_lab_credits") await supabaseAdmin.from("activity_lab_credit_orders").update({status:"expired",provider_event_id:event.id,updated_at:new Date().toISOString()}).eq("stripe_checkout_session_id",session.id).neq("status","paid");
    }else if(event.type==="checkout.session.async_payment_failed"){
      const session=event.data.object as Stripe.Checkout.Session;
      if(String(session.metadata?.dreamscape_kind||"")==="activity_lab_credits") await supabaseAdmin.from("activity_lab_credit_orders").update({status:"failed",provider_event_id:event.id,updated_at:new Date().toISOString()}).eq("stripe_checkout_session_id",session.id).neq("status","paid");
    }
    return json({ok:true});
  }catch(error){console.error("Activity Lab credit webhook failed",error);return json({error:error instanceof Error?error.message:"Webhook failed."},400);}
}
