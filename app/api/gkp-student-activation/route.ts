import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY");
      return NextResponse.json(
        { error: "Email service is temporarily unavailable." },
        { status: 500 },
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const body = await request.json();

    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim();

    if (!fullName || !email) {
      return NextResponse.json(
        { error: "Full name and email are required." },
        { status: 400 },
      );
    }

    if (!email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    const from =
      process.env.DREAMSCAPE_FROM_EMAIL?.trim() ||
      "Dreamscape One <hello@mail.dreamscape-one.com>";

    const emailResult = await resend.emails.send({
      from,
      to: "admin@gurukidspro.com",
      subject: "GKP Student Access Activation Request",
      replyTo: email,
      text: `
New GKP Student Access activation request:

Full Name:
${fullName}

Email linked to Dreamscape account:
${email}

Action needed:
Please verify whether this student is an active Guru Kids Pro student.

Verification timeline shown to user:
1–3 working days.
      `,
    });

    console.log("Resend result:", emailResult);

    if (emailResult.error) {
      return NextResponse.json(
        { error: emailResult.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      id: emailResult.data?.id,
    });
  } catch (error) {
    console.error("Activation request failed:", error);

    return NextResponse.json(
      { error: "Could not submit activation request." },
      { status: 500 },
    );
  }
}
