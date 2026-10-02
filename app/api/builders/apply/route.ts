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
  if (email.length > LIMITS.email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) return { ok: false, error: "Please enter a valid email address." };
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
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid protocol');
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
  const base = name.replace(/\\.pdf$/i, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 80) || "resume";
  return `${base}.pdf`;
}

function applicationCodeFromId(id: string) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `DSB-${date}-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

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
      .select("id, application_code")
      .eq("submission_token", data.submissionToken)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) {
      return NextResponse.json({ ok: true, applicationCode: existing.application_code, duplicate: true });
    }

    const id = crypto.randomUUID();
    const applicationCode = applicationCodeFromId(id);
    let cvPath: string | null = null;

    if (data.cv) {
      if (!(await hasPdfSignature(data.cv))) {
        return NextResponse.json({ ok: false, error: "The uploaded CV / Resume is not a valid PDF." }, { status: 400 });
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

    const { error: insertError } = await supabase
      .from("dreamscape_builder_applications")
      .insert({
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
      });

    if (insertError) {
      if (cvPath) {
        await supabase.storage.from("dreamscape-builder-cvs").remove([cvPath]);
      }
      throw insertError;
    }

    return NextResponse.json({ ok: true, applicationCode });
  } catch (error) {
    console.error("Dreamscape Builders application error:", error);
    return NextResponse.json(
      { ok: false, error: "We could not submit your application right now. Please try again." },
      { status: 500 },
    );
  }
}
