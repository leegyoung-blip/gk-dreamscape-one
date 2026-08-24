import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  createEmailDeliveryLog,
  updateEmailDeliveryLog,
} from "@/lib/email-delivery-log";

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

    const recipient = "admin@gurukidspro.com";
    const subject = "GKP Student Access Activation Request";

    const deliveryLogId = await createEmailDeliveryLog({
      category: "student_access",
      emailType: "gkp_student_access_activation_request",
      to: recipient,
      from,
      replyTo: email,
      subject,
      metadata: {
        requester_email: email,
        requester_name: fullName,
      },
    });

    const emailResult = await resend.emails.send({
      from,
      to: recipient,
      subject,
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
      await updateEmailDeliveryLog(deliveryLogId, {
        status: "failed",
        error: emailResult.error.message,
      });

      return NextResponse.json(
        { error: emailResult.error.message },
        { status: 500 },
      );
    }

    await updateEmailDeliveryLog(deliveryLogId, {
      status: "sent",
      providerMessageId: emailResult.data?.id || null,
    });

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
