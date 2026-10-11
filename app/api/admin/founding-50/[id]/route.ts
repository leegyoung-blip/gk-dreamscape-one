import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for Founding 50 update route.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function sendStatusEmail(email: string, studentName: string, status: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Dreamscape One <hello@dreamscape-one.com>";

  if (!apiKey) return;

  const messages: Record<string, { subject: string; heading: string; body: string }> = {
    approved: {
      subject: "Dreamscape Founding 50 — You’ve been selected",
      heading: "Your family has been selected.",
      body: `We’re delighted to invite <strong>${studentName}</strong> to the Dreamscape Founding 50 beta. Please follow the next-step instructions from the Dreamscape team to activate 30 days of complimentary NOVA + NOVA+ access.`,
    },
    waitlisted: {
      subject: "Dreamscape Founding 50 — You’re on the waitlist",
      heading: "You’ve been placed on our waitlist.",
      body: `Thank you for registering <strong>${studentName}</strong> for the Dreamscape Founding 50 beta. We’ll contact you if a place becomes available.`,
    },
    declined: {
      subject: "Dreamscape Founding 50 — Update on your application",
      heading: "Thank you for your interest.",
      body: `Thank you for applying to the Dreamscape Founding 50 beta for <strong>${studentName}</strong>. We’re unable to offer a beta place at this time, but we appreciate your interest in Dreamscape.`,
    },
  };

  const message = messages[status];
  if (!message) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: message.subject,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; background:#060d1a; color:#ffffff; padding:32px;">
          <div style="max-width:680px; margin:0 auto; border:1px solid rgba(142,232,255,0.2); border-radius:24px; padding:32px; background:linear-gradient(145deg, rgba(7,18,34,0.96), rgba(18,10,36,0.98));">
            <p style="margin:0 0 12px; color:#8ee8ff; font-size:12px; font-weight:800; letter-spacing:0.16em; text-transform:uppercase;">Dreamscape Founding 50</p>
            <h1 style="margin:0; font-family:Georgia, 'Times New Roman', serif; font-size:36px; font-weight:400; line-height:1.1;">${message.heading}</h1>
            <p style="margin:18px 0 0; color:rgba(255,255,255,0.78); font-size:16px; line-height:1.7;">${message.body}</p>
          </div>
        </div>
      `,
    }),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const nextStatus = String(body?.status || "").trim();
    const adminNotes = typeof body?.adminNotes === "string" ? body.adminNotes.trim() : "";

    const allowedStatuses = ["pending", "approved", "waitlisted", "declined", "invited", "activated"];
    if (!allowedStatuses.includes(nextStatus)) {
      return NextResponse.json({ error: "Invalid status update." }, { status: 400 });
    }

    const supabase = getAdminSupabase();

    const updates: Record<string, string | null> = {
      status: nextStatus,
      admin_notes: adminNotes || null,
      updated_at: new Date().toISOString(),
    };

    if (nextStatus === "approved") updates.approved_at = new Date().toISOString();
    if (nextStatus === "invited") updates.invited_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("founding_50_applications")
      .update(updates)
      .eq("id", id)
      .select("id, parent_email, student_name, status")
      .single();

    if (error || !data) {
      console.error("Founding 50 update error:", error);
      return NextResponse.json({ error: "Unable to update this application." }, { status: 500 });
    }

    if (["approved", "waitlisted", "declined"].includes(nextStatus)) {
      void sendStatusEmail(data.parent_email, data.student_name, nextStatus).catch((mailError) => {
        console.error("Founding 50 status email error:", mailError);
      });
    }

    return NextResponse.json({ ok: true, application: data });
  } catch (error) {
    console.error("Founding 50 PATCH route failed:", error);
    return NextResponse.json({ error: "Unable to update this application." }, { status: 500 });
  }
}
