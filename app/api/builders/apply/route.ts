import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CV_BYTES = 5 * 1024 * 1024;
const MAX_MULTIPART_BYTES = 7 * 1024 * 1024;

const CAREER_STAGES = new Set(["Student", "Recent graduate", "Early-career", "Self-taught", "Other"]);
const AREAS = new Set(["Build & Engineering", "AI & Learning", "Education & Curriculum", "Design & Creative", "Content & Growth"]);
const AVAILABILITY = new Set(["Under 3 hrs/week", "3–6 hrs/week", "6–10 hrs/week", "10+ hrs/week", "Flexible / depends on project"]);
const MODES = new Set(["project", "interest", "pitch"]);

const PROJECTS = new Map([
  ["science-curriculum", { title: "Science Curriculum Developer", area: "Education & Curriculum", mode: "project" }],
  ["critical-thinking", { title: "Critical Thinking Activities Developer", area: "Education & Curriculum", mode: "project" }],
  ["content-creator", { title: "Dreamscape Content Creator", area: "Content & Growth", mode: "project" }],
  ["build-interest", { title: "Build & Engineering", area: "Build & Engineering", mode: "interest" }],
  ["ai-interest", { title: "AI & Learning", area: "AI & Learning", mode: "interest" }],
  ["design-interest", { title: "Design & Creative", area: "Design & Creative", mode: "interest" }],
]);

const LIMITS = {
  fullName: 120,
  email: 254,
  schoolOrganisation: 200,
  skillsSummary: 1000,
  learningGoal: 1000,
  selfStartedExample: 1500,
  portfolioUrl: 500,
};

type ValidationResult =
  | { ok: true; data: ValidatedApplication }
  | { ok: false; error: string };

type ValidatedApplication = {
  submissionToken: string;
  applicationMode: "project" | "interest" | "pitch";
  projectId: string;
  projectTitle: string;
  fullName: string;
  email: string;
  schoolOrganisation: string | null;
  careerStage: string;
  area: string;
  skillsSummary: string;
  learningGoal: string;
  selfStartedExample: string;
  portfolioUrl: string | null;
  availability: string;
  consent: true;
  cv: File | null;
};

type SavedApplication = {
  id: string;
  application_code: string;
  full_name: string;
  email: string;
  school_organisation: string | null;
  career_stage: string;
  area: string;
  project_id: string;
  project_title: string;
  application_mode: string;
  skills_summary: string;
  learning_goal: string;
  self_started_example: string;
  portfolio_url: string | null;
  availability: string;
  cv_path: string | null;
  status: string;
  notification_status: "pending" | "sent" | "failed";
};

function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase server environment variables.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validateApplication(formData: FormData): ValidationResult {
  const website = text(formData, "website");
  if (website) return { ok: false, error: "Unable to accept this submission." };

  const submissionToken = text(formData, "submission_token");
  const applicationMode = text(formData, "application_mode");
  const projectId = text(formData, "project_id");
  const projectTitleFromClient = text(formData, "project_title");
  const fullName = text(formData, "full_name");
  const email = text(formData, "email").toLowerCase();
  const schoolOrganisation = text(formData, "school_organisation");
  const careerStage = text(formData, "career_stage");
  const areaFromClient = text(formData, "area");
  const skillsSummary = text(formData, "skills_summary");
  const learningGoal = text(formData, "learning_goal");
  const selfStartedExample = text(formData, "self_started_example");
  const portfolioUrl = text(formData, "portfolio_url");
  const availability = text(formData, "availability");
  const consent = text(formData, "consent") === "true";
  const cvValue = formData.get("cv");
  const cv = cvValue instanceof File && cvValue.size > 0 ? cvValue : null;

  if (!validUuid(submissionToken)) return { ok: false, error: "Invalid submission token. Please refresh and try again." };
  if (!MODES.has(applicationMode)) return { ok: false, error: "Invalid application type." };
  if (fullName.length < 2 || fullName.length > LIMITS.fullName) return { ok: false, error: "Please enter a valid full name." };
  if (email.length > LIMITS.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Please enter a valid email address." };
  if (schoolOrganisation.length > LIMITS.schoolOrganisation) return { ok: false, error: "School / organisation is too long." };
  if (!CAREER_STAGES.has(careerStage)) return { ok: false, error: "Please select a valid current stage." };
  if (!AREAS.has(areaFromClient)) return { ok: false, error: "Please select a valid area of interest." };
  if (!skillsSummary || skillsSummary.length > LIMITS.skillsSummary) return { ok: false, error: "Skills summary is required and must be within 1,000 characters." };
  if (!learningGoal || learningGoal.length > LIMITS.learningGoal) return { ok: false, error: "Learning goal is required and must be within 1,000 characters." };
  if (!selfStartedExample || selfStartedExample.length > LIMITS.selfStartedExample) return { ok: false, error: "Your self-started example is required and must be within 1,500 characters." };
  if (!AVAILABILITY.has(availability)) return { ok: false, error: "Please select a valid availability option." };
  if (!consent) return { ok: false, error: "Consent is required before submitting." };

  if (portfolioUrl) {
    if (portfolioUrl.length > LIMITS.portfolioUrl) return { ok: false, error: "Portfolio URL is too long." };
    try {
      const parsed = new URL(portfolioUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("invalid protocol");
    } catch {
      return { ok: false, error: "Please enter a valid portfolio URL." };
    }
  }

  let projectTitle = projectTitleFromClient;
  let area = areaFromClient;

  if (applicationMode === "pitch") {
    if (projectId !== "pitch-yourself") return { ok: false, error: "Invalid Pitch Yourself application." };
    projectTitle = "Pitch Yourself";
  } else {
    const project = PROJECTS.get(projectId);
    if (!project) return { ok: false, error: "Please select a valid Dreamscape Builders project." };
    if (project.mode !== applicationMode) return { ok: false, error: "Project application type does not match." };
    projectTitle = project.title;
    area = project.area;
  }

  if (cv) {
    if (cv.size > MAX_CV_BYTES) return { ok: false, error: "CV / Resume must be 5 MB or smaller." };
    if (cv.type !== "application/pdf" || !cv.name.toLowerCase().endsWith(".pdf")) return { ok: false, error: "CV / Resume must be a PDF file." };
  }

  return {
    ok: true,
    data: {
      submissionToken,
      applicationMode: applicationMode as ValidatedApplication["applicationMode"],
      projectId,
      projectTitle,
      fullName,
      email,
      schoolOrganisation: schoolOrganisation || null,
      careerStage,
      area,
      skillsSummary,
      learningGoal,
      selfStartedExample,
      portfolioUrl: portfolioUrl || null,
      availability,
      consent: true,
      cv,
    },
  };
}

async function hasPdfSignature(file: File) {
  const firstBytes = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...firstBytes) === "%PDF-";
}

function safeFilename(name: string) {
  const base = name
    .replace(/\.pdf$/i, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "resume";
  return `${base}.pdf`;
}

function applicationCodeFromId(id: string) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `DSB-${date}-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function modeLabel(mode: string) {
  if (mode === "interest") return "Register Interest";
  if (mode === "pitch") return "Pitch Yourself";
  return "Project Application";
}

function buildAdminEmail(application: SavedApplication) {
  const portfolio = application.portfolio_url
    ? `<a href="${escapeHtml(application.portfolio_url)}" style="color:#2563eb;">${escapeHtml(application.portfolio_url)}</a>`
    : "Not provided";

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f6f8fb;padding:28px;color:#172033;">
      <div style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #e4e8ef;border-radius:18px;overflow:hidden;">
        <div style="padding:24px 28px;background:#071426;color:#ffffff;">
          <div style="font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#9eeaff;">Dreamscape Builders</div>
          <h1 style="margin:10px 0 0;font-size:26px;line-height:1.2;">New builder application</h1>
          <p style="margin:9px 0 0;color:#cad5e4;font-size:14px;">Reference: ${escapeHtml(application.application_code)}</p>
        </div>

        <div style="padding:26px 28px;">
          <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.55;">
            <tr><td style="padding:7px 0;color:#6b7280;width:180px;">Application type</td><td style="padding:7px 0;font-weight:700;">${escapeHtml(modeLabel(application.application_mode))}</td></tr>
            <tr><td style="padding:7px 0;color:#6b7280;">Project</td><td style="padding:7px 0;font-weight:700;">${escapeHtml(application.project_title)}</td></tr>
            <tr><td style="padding:7px 0;color:#6b7280;">Area</td><td style="padding:7px 0;">${escapeHtml(application.area)}</td></tr>
            <tr><td style="padding:7px 0;color:#6b7280;">Name</td><td style="padding:7px 0;">${escapeHtml(application.full_name)}</td></tr>
            <tr><td style="padding:7px 0;color:#6b7280;">Applicant email</td><td style="padding:7px 0;">${escapeHtml(application.email)}</td></tr>
            <tr><td style="padding:7px 0;color:#6b7280;">School / organisation</td><td style="padding:7px 0;">${escapeHtml(application.school_organisation || "Not provided")}</td></tr>
            <tr><td style="padding:7px 0;color:#6b7280;">Current stage</td><td style="padding:7px 0;">${escapeHtml(application.career_stage)}</td></tr>
            <tr><td style="padding:7px 0;color:#6b7280;">Availability</td><td style="padding:7px 0;">${escapeHtml(application.availability)}</td></tr>
            <tr><td style="padding:7px 0;color:#6b7280;">Portfolio / work link</td><td style="padding:7px 0;">${portfolio}</td></tr>
            <tr><td style="padding:7px 0;color:#6b7280;">CV / Resume</td><td style="padding:7px 0;">${application.cv_path ? "Uploaded privately" : "Not provided"}</td></tr>
          </table>

          <div style="margin-top:24px;padding-top:22px;border-top:1px solid #e8ebf0;">
            <h2 style="margin:0 0 8px;font-size:16px;">What they can do</h2>
            <p style="margin:0;white-space:pre-wrap;color:#374151;">${escapeHtml(application.skills_summary)}</p>
          </div>

          <div style="margin-top:22px;">
            <h2 style="margin:0 0 8px;font-size:16px;">What they want to learn or build</h2>
            <p style="margin:0;white-space:pre-wrap;color:#374151;">${escapeHtml(application.learning_goal)}</p>
          </div>

          <div style="margin-top:22px;">
            <h2 style="margin:0 0 8px;font-size:16px;">Something they made, started or figured out</h2>
            <p style="margin:0;white-space:pre-wrap;color:#374151;">${escapeHtml(application.self_started_example)}</p>
          </div>

          <div style="margin-top:26px;padding:16px;border-radius:12px;background:#f4f7fb;color:#667085;font-size:12px;line-height:1.55;">
            The application and any CV are stored privately in Dreamscape's Supabase project. This email does not attach the CV or expose a public storage link.
          </div>
        </div>
      </div>
    </div>
  `;
}

async function sendAdminNotification(application: SavedApplication) {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.DREAMSCAPE_BUILDERS_ADMIN_EMAIL;
  const fromEmail = process.env.DREAMSCAPE_BUILDERS_FROM_EMAIL;

  if (!apiKey || !adminEmail || !fromEmail) {
    throw new Error("Missing Dreamscape Builders Resend environment variables.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [adminEmail],
      subject: `[Dreamscape Builders] ${application.project_title} — ${application.full_name}`,
      html: buildAdminEmail(application),
      reply_to: application.email,
    }),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof body?.message === "string"
        ? body.message
        : `Resend notification failed with status ${response.status}.`;
    throw new Error(message);
  }

  return typeof body?.id === "string" ? body.id : null;
}

async function notifyAndRecord(
  supabase: ReturnType<typeof getServerClient>,
  application: SavedApplication,
) {
  try {
    const resendId = await sendAdminNotification(application);

    const { error: updateError } = await supabase
      .from("dreamscape_builder_applications")
      .update({
        notification_status: "sent",
        notified_at: new Date().toISOString(),
        notification_error: null,
        resend_email_id: resendId,
      })
      .eq("id", application.id);

    if (updateError) {
      console.error("Dreamscape Builders notification status update error:", updateError);
    }

    return true;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.slice(0, 1000)
        : "Unknown notification error";

    console.error("Dreamscape Builders admin notification error:", error);

    const { error: updateError } = await supabase
      .from("dreamscape_builder_applications")
      .update({
        notification_status: "failed",
        notification_error: message,
      })
      .eq("id", application.id);

    if (updateError) {
      console.error("Dreamscape Builders notification failure status update error:", updateError);
    }

    return false;
  }
}

const APPLICATION_SELECT = `
  id,
  application_code,
  full_name,
  email,
  school_organisation,
  career_stage,
  area,
  project_id,
  project_title,
  application_mode,
  skills_summary,
  learning_goal,
  self_started_example,
  portfolio_url,
  availability,
  cv_path,
  status,
  notification_status
`;

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || "0");
    if (contentLength && contentLength > MAX_MULTIPART_BYTES) {
      return NextResponse.json({ ok: false, error: "Submission is too large." }, { status: 413 });
    }

    const formData = await request.formData();
    const validated = validateApplication(formData);
    if (!validated.ok) {
      return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
    }

    const data = validated.data;
    const supabase = getServerClient();

    const { data: existing, error: existingError } = await supabase
      .from("dreamscape_builder_applications")
      .select(APPLICATION_SELECT)
      .eq("submission_token", data.submissionToken)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      const saved = existing as SavedApplication;

      if (saved.notification_status !== "sent") {
        await notifyAndRecord(supabase, saved);
      }

      return NextResponse.json({
        ok: true,
        applicationCode: saved.application_code,
        duplicate: true,
      });
    }

    const id = crypto.randomUUID();
    const applicationCode = applicationCodeFromId(id);
    let cvPath: string | null = null;

    if (data.cv) {
      if (!(await hasPdfSignature(data.cv))) {
        return NextResponse.json(
          { ok: false, error: "The uploaded CV / Resume is not a valid PDF." },
          { status: 400 },
        );
      }

      cvPath = `${id}/${safeFilename(data.cv.name)}`;
      const bytes = Buffer.from(await data.cv.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from("dreamscape-builder-cvs")
        .upload(cvPath, bytes, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) throw uploadError;
    }

    const insertPayload = {
      id,
      application_code: applicationCode,
      submission_token: data.submissionToken,
      full_name: data.fullName,
      email: data.email,
      school_organisation: data.schoolOrganisation,
      career_stage: data.careerStage,
      area: data.area,
      project_id: data.projectId,
      project_title: data.projectTitle,
      application_mode: data.applicationMode,
      skills_summary: data.skillsSummary,
      learning_goal: data.learningGoal,
      self_started_example: data.selfStartedExample,
      portfolio_url: data.portfolioUrl,
      availability: data.availability,
      cv_path: cvPath,
      status: "new",
      notification_status: "pending",
    };

    const { data: inserted, error: insertError } = await supabase
      .from("dreamscape_builder_applications")
      .insert(insertPayload)
      .select(APPLICATION_SELECT)
      .single();

    if (insertError) {
      if (cvPath) {
        await supabase.storage.from("dreamscape-builder-cvs").remove([cvPath]);
      }
      throw insertError;
    }

    const saved = inserted as SavedApplication;

    // Notification failure must never invalidate a successfully saved application.
    await notifyAndRecord(supabase, saved);

    return NextResponse.json({
      ok: true,
      applicationCode,
    });
  } catch (error) {
    console.error("Dreamscape Builders application error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "We could not submit your application right now. Please try again.",
      },
      { status: 500 },
    );
  }
}
