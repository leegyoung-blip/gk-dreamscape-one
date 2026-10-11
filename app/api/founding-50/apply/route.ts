import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const FOUNDING_50_TERMS_VERSION = "founding50-v1";

function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for Founding 50 route.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function sendAcknowledgementEmail(email: string, studentName: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Dreamscape One <hello@dreamscape-one.com>";

  if (!apiKey) return;

  const subject = "Dreamscape Founding 50 — We’ve received your interest";
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; background:#060d1a; color:#ffffff; padding:32px;">
      <div style="max-width:680px; margin:0 auto; border:1px solid rgba(142,232,255,0.2); border-radius:24px; padding:32px; background:linear-gradient(145deg, rgba(7,18,34,0.96), rgba(18,10,36,0.98));">
        <p style="margin:0 0 12px; color:#8ee8ff; font-size:12px; font-weight:800; letter-spacing:0.16em; text-transform:uppercase;">Dreamscape Founding 50</p>
        <h1 style="margin:0; font-family:Georgia, 'Times New Roman', serif; font-size:36px; font-weight:400; line-height:1.1;">Thanks for registering your interest.</h1>
        <p style="margin:18px 0 0; color:rgba(255,255,255,0.78); font-size:16px; line-height:1.7;">
          We’ve received your Founding 50 application for <strong>${studentName}</strong>. If your family is selected, we’ll email you with activation details for 30 days of complimentary NOVA + NOVA+ access.
        </p>
        <div style="margin-top:22px; padding:18px 20px; border-radius:18px; border:1px solid rgba(142,232,255,0.16); background:rgba(255,255,255,0.04);">
          <p style="margin:0 0 10px; color:#8ee8ff; font-size:12px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase;">What happens next</p>
          <ul style="margin:0; padding-left:18px; color:rgba(255,255,255,0.82); font-size:15px; line-height:1.7;">
            <li>Your application will be reviewed manually.</li>
            <li>Selected families will be invited to activate their child’s beta access.</li>
            <li>No payment details are required during registration.</li>
          </ul>
        </div>
      </div>
    </div>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject,
      html,
    }),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const studentName = String(body?.studentName || "").trim();
    const studentAge = Number(body?.studentAge);
    const email = String(body?.email || "").trim().toLowerCase();
    const consentAccepted = Boolean(body?.consentAccepted);
    const termsVersion = String(body?.termsVersion || FOUNDING_50_TERMS_VERSION);

    if (!studentName || !email || !consentAccepted || !Number.isFinite(studentAge)) {
      return NextResponse.json(
        { error: "Please complete all required fields before submitting." },
        { status: 400 }
      );
    }

    if (studentAge < 6 || studentAge > 12) {
      return NextResponse.json(
        { error: "Founding 50 applications are currently open for students aged 6 to 12." },
        { status: 400 }
      );
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const supabase = getAdminSupabase();

    const { data: existing } = await supabase
      .from("founding_50_applications")
      .select("id, status")
      .eq("parent_email", email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "We already have an active Founding 50 application for this email address." },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("founding_50_applications")
      .insert({
        parent_email: email,
        student_name: studentName,
        student_age: studentAge,
        consent_accepted: true,
        consented_at: new Date().toISOString(),
        terms_version: termsVersion,
        submission_source: "homepage-banner",
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Founding 50 insert error:", error);
      return NextResponse.json(
        { error: "We could not save your application right now. Please try again shortly." },
        { status: 500 }
      );
    }

    void sendAcknowledgementEmail(email, studentName).catch((mailError) => {
      console.error("Founding 50 acknowledgement email error:", mailError);
    });

    return NextResponse.json({ ok: true, applicationId: data.id });
  } catch (error) {
    console.error("Founding 50 apply route failed:", error);
    return NextResponse.json(
      { error: "Unable to process your application right now." },
      { status: 500 }
    );
  }
}
