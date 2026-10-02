"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, FormEvent } from "react";

type BuilderTrack = {
  title: string;
  description: string;
  accent: string;
  status: "open-soon" | "active";
};

type BuilderProject = {
  id: string;
  title: string;
  area: string;
  summary: string;
  fit: string;
  accent: string;
  open: boolean;
};

const builderTracks: BuilderTrack[] = [
  {
    title: "Build & Engineering",
    description:
      "Product features, learning games, prototypes and internal tools across Dreamscape.",
    accent: "#8ee8ff",
    status: "open-soon",
  },
  {
    title: "AI & Learning",
    description:
      "AI teaching evaluation, explanation quality, adaptive learning and learning-system experiments.",
    accent: "#a7b8ff",
    status: "open-soon",
  },
  {
    title: "Education & Curriculum",
    description:
      "Curriculum development, Science, critical thinking and learning activity design.",
    accent: "#f6c453",
    status: "active",
  },
  {
    title: "Design & Creative",
    description:
      "UI/UX, graphics, worlds, motion and visual storytelling for the Dreamscape ecosystem.",
    accent: "#c58cff",
    status: "open-soon",
  },
  {
    title: "Content & Growth",
    description:
      "Educational content, social carousels, campaign concepts and community-facing storytelling.",
    accent: "#ff9f68",
    status: "active",
  },
];

const builderProjects: BuilderProject[] = [
  { id: "science-curriculum", title: "Science Curriculum Developer", area: "Education & Curriculum", summary: "Help develop and review primary-level Science learning content, question sets and activities for Dreamscape.", fit: "Strong Science knowledge, curriculum experience, teaching or tutoring exposure, or education studies.", accent: "#f6c453", open: true },
  { id: "critical-thinking", title: "Critical Thinking Activities Developer", area: "Education & Curriculum", summary: "Design engaging reasoning, logic and problem-solving activities for Think Missions and other Dreamscape learning experiences.", fit: "Best for someone who enjoys puzzles, reasoning tasks, enrichment activities or challenge design.", accent: "#8ee8ff", open: true },
  { id: "content-creator", title: "Dreamscape Content Creator", area: "Content & Growth", summary: "Turn Dreamscape’s learning ideas, worlds and products into useful social content people genuinely want to follow.", fit: "Educational explainers, Instagram carousels, campaign concepts and visual storytelling.", accent: "#ff9f68", open: true },
  { id: "build-interest", title: "Build & Engineering", area: "Build & Engineering", summary: "Future projects may include product features, learning games, internal tools, prototypes and QA work.", fit: "Register your interest now if you build things and want to contribute when projects open.", accent: "#8ee8ff", open: false },
  { id: "ai-interest", title: "AI & Learning", area: "AI & Learning", summary: "Future projects may include teaching-engine evaluation, AI explanation quality and adaptive-learning experiments.", fit: "Register your interest if AI, education or evaluation work interests you.", accent: "#a7b8ff", open: false },
  { id: "design-interest", title: "Design & Creative", area: "Design & Creative", summary: "Future projects may include UI/UX, graphics, world-building, motion and visual storytelling.", fit: "Register your interest if you are building a creative portfolio and want real project experience.", accent: "#c58cff", open: false },
];

const availabilityOptions = ["Under 3 hrs/week", "3–6 hrs/week", "6–10 hrs/week", "10+ hrs/week", "Flexible / depends on project"];


const careerStageOptions = ["Student", "Recent graduate", "Early-career", "Self-taught", "Other"];
const areaOptions = builderTracks.map((track) => track.title);

const FIELD_LIMITS = {
  fullName: 120,
  email: 254,
  schoolOrganisation: 200,
  skillsSummary: 1000,
  learningGoal: 1000,
  selfStartedExample: 1500,
  portfolioUrl: 500,
} as const;

const MAX_CV_BYTES = 5 * 1024 * 1024;

type FormState = {
  fullName: string;
  email: string;
  schoolOrganisation: string;
  careerStage: string;
  area: string;
  skillsSummary: string;
  learningGoal: string;
  selfStartedExample: string;
  portfolioUrl: string;
  availability: string;
  consent: boolean;
  website: string;
};

type FormErrors = Partial<Record<keyof FormState | "project" | "cv" | "submit", string>>;
type SubmitState = "idle" | "submitting" | "success" | "error";

function initialFormState(): FormState {
  return {
    fullName: "",
    email: "",
    schoolOrganisation: "",
    careerStage: "",
    area: "",
    skillsSummary: "",
    learningGoal: "",
    selfStartedExample: "",
    portfolioUrl: "",
    availability: "",
    consent: false,
    website: "",
  };
}

function createSubmissionToken() {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `fallback-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function JoinUsPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [applicationMode, setApplicationMode] = useState<"project" | "interest" | "pitch">("project");
  const [form, setForm] = useState<FormState>(() => initialFormState());
  const [errors, setErrors] = useState<FormErrors>({});
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [applicationCode, setApplicationCode] = useState("");
  const [submissionToken, setSubmissionToken] = useState(() => createSubmissionToken());
  const cvInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function checkScreen() {
      setIsMobile(window.innerWidth <= 900);
    }
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  function startApplication(project: BuilderProject) {
    setSelectedProject(project.id);
    setApplicationMode(project.open ? "project" : "interest");
    setForm((current) => ({ ...current, area: project.area }));
    setErrors({});
    setSubmitState("idle");
    setApplicationCode("");
    window.setTimeout(() => document.getElementById("application")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  }

  function startPitch() {
    setSelectedProject("");
    setApplicationMode("pitch");
    setForm((current) => ({ ...current, area: "" }));
    setErrors({});
    setSubmitState("idle");
    setApplicationCode("");
    window.setTimeout(() => document.getElementById("application")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  }

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, submit: undefined }));
    if (submitState === "error") setSubmitState("idle");
  }

  function validateClientForm() {
    const next: FormErrors = {};
    const emailPattern = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

    if (form.fullName.trim().length < 2) next.fullName = "Please enter your full name.";
    else if (form.fullName.trim().length > FIELD_LIMITS.fullName) next.fullName = `Maximum ${FIELD_LIMITS.fullName} characters.`;

    if (!emailPattern.test(form.email.trim())) next.email = "Please enter a valid email address.";
    else if (form.email.trim().length > FIELD_LIMITS.email) next.email = "Email address is too long.";

    if (form.schoolOrganisation.trim().length > FIELD_LIMITS.schoolOrganisation) next.schoolOrganisation = `Maximum ${FIELD_LIMITS.schoolOrganisation} characters.`;
    if (!careerStageOptions.includes(form.careerStage)) next.careerStage = "Please select your current stage.";
    if (!areaOptions.includes(form.area)) next.area = "Please select an area of interest.";
    if (applicationMode !== "pitch" && !selectedProjectData) next.project = "Please select a project.";

    if (!form.skillsSummary.trim()) next.skillsSummary = "Please tell us briefly what you can do.";
    else if (form.skillsSummary.length > FIELD_LIMITS.skillsSummary) next.skillsSummary = `Maximum ${FIELD_LIMITS.skillsSummary} characters.`;

    if (!form.learningGoal.trim()) next.learningGoal = "Please tell us what you would like to learn or build.";
    else if (form.learningGoal.length > FIELD_LIMITS.learningGoal) next.learningGoal = `Maximum ${FIELD_LIMITS.learningGoal} characters.`;

    if (!form.selfStartedExample.trim()) next.selfStartedExample = "Please share one example.";
    else if (form.selfStartedExample.length > FIELD_LIMITS.selfStartedExample) next.selfStartedExample = `Maximum ${FIELD_LIMITS.selfStartedExample} characters.`;

    if (form.portfolioUrl.trim()) {
      if (form.portfolioUrl.trim().length > FIELD_LIMITS.portfolioUrl) next.portfolioUrl = `Maximum ${FIELD_LIMITS.portfolioUrl} characters.`;
      else {
        try {
          const parsed = new URL(form.portfolioUrl.trim());
          if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid');
        } catch {
          next.portfolioUrl = "Please enter a full http:// or https:// URL.";
        }
      }
    }

    if (!availabilityOptions.includes(form.availability)) next.availability = "Please select your availability.";
    if (!form.consent) next.consent = "Consent is required before submitting.";

    if (cvFile) {
      if (cvFile.size > MAX_CV_BYTES) next.cv = "CV / Resume must be 5 MB or smaller.";
      const isPdfType = cvFile.type === "application/pdf";
      const isPdfName = cvFile.name.toLowerCase().endsWith(".pdf");
      if (!isPdfType || !isPdfName) next.cv = "CV / Resume must be a PDF file.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleCvChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setCvFile(null);
      setErrors((current) => ({ ...current, cv: undefined }));
      return;
    }

    if (file.size > MAX_CV_BYTES) {
      setCvFile(null);
      event.currentTarget.value = "";
      setErrors((current) => ({ ...current, cv: "CV / Resume must be 5 MB or smaller." }));
      return;
    }

    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
      setCvFile(null);
      event.currentTarget.value = "";
      setErrors((current) => ({ ...current, cv: "CV / Resume must be a PDF file." }));
      return;
    }

    setCvFile(file);
    setErrors((current) => ({ ...current, cv: undefined }));
  }

  function removeCv() {
    setCvFile(null);
    if (cvInputRef.current) cvInputRef.current.value = "";
    setErrors((current) => ({ ...current, cv: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitState === "submitting") return;
    if (!validateClientForm()) return;

    setSubmitState("submitting");
    setErrors((current) => ({ ...current, submit: undefined }));

    const projectId = applicationMode === "pitch" ? "pitch-yourself" : selectedProjectData?.id ?? "";
    const projectTitle = applicationMode === "pitch" ? "Pitch Yourself" : selectedProjectData?.title ?? "";

    const payload = new FormData();
    payload.append("submission_token", submissionToken);
    payload.append("application_mode", applicationMode);
    payload.append("project_id", projectId);
    payload.append("project_title", projectTitle);
    payload.append("full_name", form.fullName.trim());
    payload.append("email", form.email.trim());
    payload.append("school_organisation", form.schoolOrganisation.trim());
    payload.append("career_stage", form.careerStage);
    payload.append("area", form.area);
    payload.append("skills_summary", form.skillsSummary.trim());
    payload.append("learning_goal", form.learningGoal.trim());
    payload.append("self_started_example", form.selfStartedExample.trim());
    payload.append("portfolio_url", form.portfolioUrl.trim());
    payload.append("availability", form.availability);
    payload.append("consent", form.consent ? "true" : "false");
    payload.append("website", form.website);
    if (cvFile) payload.append("cv", cvFile);

    try {
      const response = await fetch("/api/builders/apply", {
        method: "POST",
        body: payload,
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        const message = typeof result?.error === "string" ? result.error : "We could not submit your application. Please check your details and try again.";
        setErrors((current) => ({ ...current, submit: message }));
        setSubmitState("error");
        return;
      }

      setApplicationCode(result.applicationCode ?? "");
      setSubmitState("success");
      setForm(initialFormState());
      setCvFile(null);
      setSelectedProject("");
      setApplicationMode("project");
      setSubmissionToken(createSubmissionToken());
      if (cvInputRef.current) cvInputRef.current.value = "";
    } catch {
      setErrors((current) => ({ ...current, submit: "We could not connect to the application service. Please try again." }));
      setSubmitState("error");
    }
  }

  const selectedProjectData = builderProjects.find((project) => project.id === selectedProject);

  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100%",
        overflowX: "hidden",
        background:
          "radial-gradient(circle at 14% 4%, rgba(83,215,255,0.13), transparent 28%), radial-gradient(circle at 86% 12%, rgba(197,140,255,0.13), transparent 30%), #020813",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          height: isMobile ? "72px" : "82px",
          padding: isMobile ? "0 16px" : "0 5vw",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "18px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(2,8,19,0.9)",
          backdropFilter: "blur(18px)",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            color: "white",
            textDecoration: "none",
          }}
        >
          <img
            src="/home/dreamscape-logo.png"
            alt="Dreamscape One logo"
            style={{
              width: isMobile ? "40px" : "46px",
              height: isMobile ? "40px" : "46px",
              objectFit: "contain",
              borderRadius: "999px",
            }}
          />
          <span
            style={{
              fontSize: isMobile ? "11px" : "14px",
              fontWeight: 700,
              letterSpacing: isMobile ? "0.16em" : "0.22em",
              whiteSpace: "nowrap",
            }}
          >
            DREAMSCAPE ONE
          </span>
        </Link>

        <Link
          href="/"
          style={{
            minHeight: "42px",
            padding: "10px 15px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "999px",
            border: "1px solid rgba(142,232,255,0.22)",
            background: "rgba(83,215,255,0.06)",
            color: "#bdefff",
            textDecoration: "none",
            fontSize: "10px",
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          ← Back Home
        </Link>
      </header>

      <section
        style={{
          position: "relative",
          minHeight: isMobile ? "auto" : "calc(100vh - 82px)",
          padding: isMobile ? "72px 20px 66px" : "76px 6vw 84px",
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr"
            : "minmax(0, 1.1fr) minmax(300px, 0.7fr)",
          gap: isMobile ? "40px" : "7vw",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "relative", zIndex: 2, maxWidth: "860px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "9px",
              padding: "8px 12px",
              borderRadius: "999px",
              border: "1px solid rgba(142,232,255,0.22)",
              background: "rgba(83,215,255,0.06)",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "999px",
                background: "#8ee8ff",
                boxShadow: "0 0 16px rgba(142,232,255,0.65)",
              }}
            />
            <span
              style={{
                color: "#bdefff",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              Dreamscape Builders
            </span>
          </div>

          <h1
            style={{
              margin: "24px 0 0",
              maxWidth: "820px",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "48px" : "clamp(58px, 6vw, 88px)",
              fontWeight: 400,
              lineHeight: 0.99,
              letterSpacing: "-0.025em",
            }}
          >
            Build something real.
          </h1>

          <p
            style={{
              margin: "26px 0 0",
              maxWidth: "780px",
              color: "rgba(255,255,255,0.76)",
              fontSize: isMobile ? "17px" : "20px",
              fontWeight: 300,
              lineHeight: 1.7,
            }}
          >
            Dreamscape Builders is for students, recent graduates and early-career builders who want to contribute to real projects while developing practical experience.
          </p>

          <p
            style={{
              margin: "16px 0 0",
              maxWidth: "730px",
              color: "rgba(255,255,255,0.52)",
              fontSize: isMobile ? "14px" : "15px",
              lineHeight: 1.65,
            }}
          >
            We keep projects small and purposeful. We care more about initiative, curiosity and what you can do than a perfect CV.
          </p>

          <div style={{ marginTop: "29px", display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("open-projects")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              style={{
                minHeight: "52px",
                padding: "13px 22px",
                borderRadius: "999px",
                border: "none",
                background: "linear-gradient(90deg, #8ee8ff, #c58cff)",
                color: "#130725",
                fontSize: "11px",
                fontWeight: 900,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              View Open Projects
            </button>

            <button
              type="button"
onClick={startPitch}
              style={{
                minHeight: "52px",
                padding: "13px 22px",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.22)",
                background: "rgba(255,255,255,0.045)",
                color: "white",
                fontSize: "11px",
                fontWeight: 900,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Pitch Yourself
            </button>
          </div>

          <div style={{ marginTop: "24px", display: "flex", flexWrap: "wrap", gap: "9px" }}>
            {["Project-based", "Flexible", "Remote-friendly"].map((item) => (
              <span
                key={item}
                style={{
                  padding: "8px 10px",
                  borderRadius: "999px",
                  border: "1px solid rgba(142,232,255,0.14)",
                  background: "rgba(255,255,255,0.035)",
                  color: "rgba(255,255,255,0.62)",
                  fontSize: "11px",
                  fontWeight: 800,
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div
          aria-hidden="true"
          style={{
            position: "relative",
            zIndex: 2,
            minHeight: isMobile ? "330px" : "620px",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: isMobile ? "300px" : "430px",
              height: isMobile ? "300px" : "430px",
              borderRadius: "999px",
              background:
                "radial-gradient(circle, rgba(83,215,255,0.2), rgba(197,140,255,0.08) 50%, transparent 72%)",
            }}
          />
          <img
            src="/nova/nova-character.png"
            alt=""
            style={{
              position: "relative",
              height: isMobile ? "320px" : "590px",
              maxWidth: "100%",
              width: "auto",
              objectFit: "contain",
              display: "block",
              filter: "drop-shadow(0 28px 60px rgba(0,0,0,0.48))",
            }}
          />
        </div>
      </section>

      <section id="open-projects" style={{ scrollMarginTop: isMobile ? "92px" : "102px", padding: isMobile ? "78px 20px" : "104px 6vw", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ maxWidth: "1380px", margin: "0 auto" }}>
          <p style={eyebrowStyle("#8ee8ff")}>Open projects</p>
          <h2 style={sectionHeadingStyle(isMobile)}>Choose a project you genuinely want to work on.</h2>
          <p style={sectionTextStyle(isMobile)}>Live opportunities are shown first. Other tracks are open for early interest so we can reach out when the right project becomes available.</p>
          <div style={{ marginTop: isMobile ? "32px" : "44px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: isMobile ? "18px" : "22px" }}>
            {builderProjects.map((project) => (
              <article key={project.id} style={{ minHeight: isMobile ? "auto" : "430px", padding: isMobile ? "26px 23px" : "30px 27px", display: "flex", flexDirection: "column", borderRadius: "28px", border: `1px solid ${project.accent}${project.open ? "48" : "28"}`, background: project.open ? `radial-gradient(circle at 10% 0%, ${project.accent}16, transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.068), rgba(255,255,255,0.018))` : "linear-gradient(145deg, rgba(255,255,255,0.038), rgba(255,255,255,0.012))" }}>
                <span style={{ alignSelf: "flex-start", padding: "7px 10px", borderRadius: "999px", border: `1px solid ${project.accent}36`, background: `${project.accent}10`, color: project.accent, fontSize: "9px", fontWeight: 900, letterSpacing: "0.11em", textTransform: "uppercase" }}>{project.open ? "Open project" : "Opportunities coming soon"}</span>
                <h3 style={{ margin: "20px 0 0", color: "white", fontSize: isMobile ? "27px" : "30px", fontWeight: 800, lineHeight: 1.15 }}>{project.title}</h3>
                <p style={{ margin: "17px 0 0", color: "rgba(255,255,255,0.7)", fontSize: "15px", lineHeight: 1.66 }}>{project.summary}</p>
                <p style={{ margin: "14px 0 0", color: "rgba(255,255,255,0.5)", fontSize: "13px", lineHeight: 1.62 }}>{project.fit}</p>
                <div style={{ marginTop: "20px", paddingTop: "18px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "grid", gap: "9px" }}>
                  <span style={{ color: "rgba(255,255,255,0.62)", fontSize: "11px", fontWeight: 700 }}>Project-based · Flexible · Remote-friendly</span>
                  <span style={{ color: "rgba(255,255,255,0.46)", fontSize: "11px" }}>{project.open ? "Typical duration: 4–6 weeks · 3–6 hrs/week" : "Details announced when a project opens"}</span>
                </div>
                <button type="button" onClick={() => startApplication(project)} style={{ marginTop: "auto", minHeight: "48px", padding: "12px 16px", border: "none", borderRadius: "999px", background: project.open ? `linear-gradient(90deg, ${project.accent}, #c58cff)` : "rgba(255,255,255,0.075)", color: project.open ? "#130725" : "rgba(255,255,255,0.82)", fontSize: "10px", fontWeight: 900, letterSpacing: "0.09em", textTransform: "uppercase", cursor: "pointer" }}>{project.open ? "Apply for this project" : "Register Interest"}</button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="builder-tracks"
        style={{
          scrollMarginTop: isMobile ? "92px" : "102px",
          padding: isMobile ? "78px 20px" : "104px 6vw",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ maxWidth: "1380px", margin: "0 auto" }}>
          <p style={eyebrowStyle("#8ee8ff")}>Ways to contribute</p>
          <h2 style={sectionHeadingStyle(isMobile)}>
            Find the kind of work you want to grow through.
          </h2>
          <p style={sectionTextStyle(isMobile)}>
            Dreamscape spans product development, AI-assisted learning, curriculum, design and content. Open projects will appear inside these tracks as they become available.
          </p>

          <div
            style={{
              marginTop: isMobile ? "34px" : "48px",
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(5, minmax(0, 1fr))",
              gap: isMobile ? "16px" : "18px",
            }}
          >
            {builderTracks.map((track) => (
              <article
                key={track.title}
                style={{
                  minHeight: isMobile ? "auto" : "260px",
                  padding: isMobile ? "24px 22px" : "27px 23px",
                  borderRadius: "24px",
                  border: `1px solid ${track.accent}30`,
                  background:
                    "linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.015))",
                }}
              >
                <div
                  style={{
                    width: "38px",
                    height: "4px",
                    borderRadius: "999px",
                    background: track.accent,
                    boxShadow: `0 0 16px ${track.accent}55`,
                  }}
                />
                <h3 style={{ margin: "20px 0 0", fontSize: "22px", fontWeight: 800, lineHeight: 1.18 }}>
                  {track.title}
                </h3>
                <p
                  style={{
                    margin: "15px 0 0",
                    color: "rgba(255,255,255,0.62)",
                    fontSize: "14px",
                    lineHeight: 1.62,
                  }}
                >
                  {track.description}
                </p>
                <p
                  style={{
                    margin: "20px 0 0",
                    color: track.accent,
                    fontSize: "10px",
                    fontWeight: 900,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  {track.status === "active"
                    ? "Open projects in next phase"
                    : "Opportunities coming soon"}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: isMobile ? "78px 20px" : "102px 6vw" }}>
        <div
          style={{
            maxWidth: "1220px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "0.9fr 1.1fr",
            gap: isMobile ? "34px" : "70px",
          }}
        >
          <div>
            <p style={eyebrowStyle("#c58cff")}>Why Dreamscape Builders</p>
            <h2 style={sectionHeadingStyle(isMobile)}>
              Experience that comes from making something useful.
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: "16px",
            }}
          >
            {[
              ["Real ownership", "Work on a clearly scoped project with a real outcome, not filler tasks."],
              ["Portfolio value", "Where appropriate, use completed work to explain what you built and contributed."],
              ["Direct feedback", "Get practical feedback from the people actively building Dreamscape."],
              ["Flexible project work", "Projects are designed to fit around study, work and other commitments."],
            ].map(([title, text]) => (
              <article
                key={title}
                style={{
                  padding: "24px 22px",
                  borderRadius: "22px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.035)",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "19px", fontWeight: 800 }}>{title}</h3>
                <p
                  style={{
                    margin: "11px 0 0",
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "14px",
                    lineHeight: 1.62,
                  }}
                >
                  {text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pitch-yourself" style={{ padding: isMobile ? "0 20px 88px" : "12px 6vw 116px" }}>
        <div
          style={{
            maxWidth: "1220px",
            margin: "0 auto",
            padding: isMobile ? "34px 26px" : "46px 48px",
            borderRadius: isMobile ? "28px" : "34px",
            border: "1px solid rgba(246,196,83,0.2)",
            background:
              "radial-gradient(circle at 10% 20%, rgba(246,196,83,0.09), transparent 30%), linear-gradient(145deg, rgba(24,19,8,0.75), rgba(9,9,23,0.94))",
          }}
        >
          <p style={eyebrowStyle("#f6c453")}>Pitch yourself</p>
          <h2 style={sectionHeadingStyle(isMobile)}>Don’t see the right project yet?</h2>
          <p style={{ ...sectionTextStyle(isMobile), maxWidth: "860px" }}>
            Tell us what you are good at, what you want to learn, and what you think you could build for Dreamscape. Strong pitches can create opportunities we had not planned yet.
          </p>
          <button type="button" onClick={startPitch} style={{ marginTop: "26px", minHeight: "50px", padding: "12px 20px", borderRadius: "999px", border: "none", background: "linear-gradient(90deg, #f6c453, #ff9f68)", color: "#211304", fontSize: "10px", fontWeight: 900, letterSpacing: "0.09em", textTransform: "uppercase", cursor: "pointer" }}>Propose a Project</button>
        </div>
      </section>

      <section id="application" style={{ scrollMarginTop: isMobile ? "90px" : "100px", padding: isMobile ? "42px 20px 90px" : "54px 6vw 118px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <p style={eyebrowStyle("#c58cff")}>Application</p>
          <h2 style={sectionHeadingStyle(isMobile)}>Tell us a little about yourself.</h2>
          <p style={{ ...sectionTextStyle(isMobile), maxWidth: "820px" }}>
            Choose an open project, register interest in a future track, or pitch your own contribution. CV / Resume upload is optional.
          </p>

          {submitState === "success" ? (
            <div
              role="status"
              style={{
                marginTop: "30px",
                padding: isMobile ? "30px 24px" : "38px 36px",
                borderRadius: "28px",
                border: "1px solid rgba(123,243,183,0.3)",
                background: "radial-gradient(circle at 10% 20%, rgba(123,243,183,0.1), transparent 35%), rgba(7,24,20,0.72)",
              }}
            >
              <p style={{ margin: 0, color: "#7bf3b7", fontSize: "11px", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                Application received
              </p>
              <h3 style={{ margin: "14px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "32px" : "40px", fontWeight: 400 }}>
                Thanks for your interest in Dreamscape Builders.
              </h3>
              <p style={{ margin: "16px 0 0", maxWidth: "760px", color: "rgba(255,255,255,0.68)", fontSize: "15px", lineHeight: 1.65 }}>
                Your application has been stored securely. We’ll review it and get in touch if there is a suitable next step.
              </p>
              {applicationCode && (
                <p style={{ margin: "18px 0 0", color: "rgba(255,255,255,0.48)", fontSize: "12px", fontWeight: 700 }}>
                  Reference: {applicationCode}
                </p>
              )}
              <button type="button" onClick={() => { setSubmitState("idle"); setApplicationCode(""); }} style={{ marginTop: "22px", minHeight: "46px", padding: "11px 18px", borderRadius: "999px", border: "1px solid rgba(123,243,183,0.24)", background: "rgba(123,243,183,0.08)", color: "#9cf6c9", fontSize: "10px", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
                Start another application
              </button>
            </div>
          ) : (
            <>
              {(selectedProjectData || applicationMode === "pitch") && (
                <div style={{ marginTop: "26px", padding: "17px 19px", borderRadius: "18px", border: "1px solid rgba(142,232,255,0.18)", background: "rgba(83,215,255,0.045)" }}>
                  <p style={{ margin: 0, color: "#8ee8ff", fontSize: "10px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                    {applicationMode === "pitch" ? "Pitch Yourself" : applicationMode === "interest" ? "Registering Interest" : "Applying For"}
                  </p>
                  <p style={{ margin: "7px 0 0", fontSize: "18px", fontWeight: 800 }}>
                    {applicationMode === "pitch" ? "Propose your own contribution" : selectedProjectData?.title}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate style={{ marginTop: "28px", padding: isMobile ? "24px 20px" : "34px 32px", borderRadius: "28px", border: "1px solid rgba(255,255,255,0.1)", background: "linear-gradient(145deg, rgba(255,255,255,0.052), rgba(255,255,255,0.016))" }}>
                <div style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }} aria-hidden="true">
                  <label>
                    Website
                    <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => updateField("website", event.target.value)} />
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "18px" }}>
                  <FormField label="Full name" error={errors.fullName} required>
                    <input value={form.fullName} maxLength={FIELD_LIMITS.fullName} onChange={(event) => updateField("fullName", event.target.value)} placeholder="Your name" autoComplete="name" style={inputStyle(Boolean(errors.fullName))} />
                  </FormField>

                  <FormField label="Email" error={errors.email} required>
                    <input value={form.email} maxLength={FIELD_LIMITS.email} onChange={(event) => updateField("email", event.target.value)} type="email" placeholder="you@example.com" autoComplete="email" style={inputStyle(Boolean(errors.email))} />
                  </FormField>

                  <FormField label="Current school / organisation" error={errors.schoolOrganisation} hint="Optional">
                    <input value={form.schoolOrganisation} maxLength={FIELD_LIMITS.schoolOrganisation} onChange={(event) => updateField("schoolOrganisation", event.target.value)} placeholder="School, university, company or independent" style={inputStyle(Boolean(errors.schoolOrganisation))} />
                  </FormField>

                  <FormField label="Current stage" error={errors.careerStage} required>
                    <select value={form.careerStage} onChange={(event) => updateField("careerStage", event.target.value)} style={inputStyle(Boolean(errors.careerStage))}>
                      <option value="">Select one</option>
                      {careerStageOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </FormField>

                  <FormField label="Area of interest" error={errors.area} required>
                    <select value={form.area} onChange={(event) => updateField("area", event.target.value)} disabled={applicationMode !== "pitch" && Boolean(selectedProjectData)} style={inputStyle(Boolean(errors.area), applicationMode !== "pitch" && Boolean(selectedProjectData))}>
                      <option value="">Select an area</option>
                      {areaOptions.map((area) => <option key={area} value={area}>{area}</option>)}
                    </select>
                  </FormField>

                  <FormField label="Project" error={errors.project} required={applicationMode !== "pitch"}>
                    {applicationMode === "pitch" ? (
                      <input readOnly value="Pitch Yourself" style={inputStyle(false, true)} />
                    ) : (
                      <select
                        value={selectedProject}
                        onChange={(event) => {
                          const next = builderProjects.find((project) => project.id === event.target.value);
                          setSelectedProject(event.target.value);
                          if (next) {
                            setApplicationMode(next.open ? "project" : "interest");
                            setForm((current) => ({ ...current, area: next.area }));
                          }
                          setErrors((current) => ({ ...current, project: undefined, area: undefined }));
                        }}
                        style={inputStyle(Boolean(errors.project))}
                      >
                        <option value="">Select a project</option>
                        {builderProjects.map((project) => <option key={project.id} value={project.id}>{project.title}{project.open ? "" : " — Register Interest"}</option>)}
                      </select>
                    )}
                  </FormField>

                  <FormField label="Availability" error={errors.availability} required>
                    <select value={form.availability} onChange={(event) => updateField("availability", event.target.value)} style={inputStyle(Boolean(errors.availability))}>
                      <option value="">Select availability</option>
                      {availabilityOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </FormField>
                </div>

                <div style={{ marginTop: "18px", display: "grid", gap: "18px" }}>
                  <FormField label="Tell us briefly what you can do" error={errors.skillsSummary} required count={`${form.skillsSummary.length}/${FIELD_LIMITS.skillsSummary}`}>
                    <textarea value={form.skillsSummary} maxLength={FIELD_LIMITS.skillsSummary} onChange={(event) => updateField("skillsSummary", event.target.value)} placeholder="Skills, experience, tools, subjects or kinds of work you are confident with." style={textareaStyle(Boolean(errors.skillsSummary))} />
                  </FormField>

                  <FormField label="What would you like to learn or build?" error={errors.learningGoal} required count={`${form.learningGoal.length}/${FIELD_LIMITS.learningGoal}`}>
                    <textarea value={form.learningGoal} maxLength={FIELD_LIMITS.learningGoal} onChange={(event) => updateField("learningGoal", event.target.value)} placeholder="Tell us what you hope to gain from the project and what kind of contribution interests you." style={textareaStyle(Boolean(errors.learningGoal))} />
                  </FormField>

                  <FormField label="What is something you have made, started or figured out on your own?" error={errors.selfStartedExample} required count={`${form.selfStartedExample.length}/${FIELD_LIMITS.selfStartedExample}`}>
                    <textarea value={form.selfStartedExample} maxLength={FIELD_LIMITS.selfStartedExample} onChange={(event) => updateField("selfStartedExample", event.target.value)} placeholder="A project, activity, experiment, piece of content, event, system, idea or problem you solved." style={textareaStyle(Boolean(errors.selfStartedExample))} />
                  </FormField>
                </div>

                <div style={{ marginTop: "18px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "18px" }}>
                  <FormField label="Portfolio / GitHub / LinkedIn / work link" error={errors.portfolioUrl} hint="Optional">
                    <input value={form.portfolioUrl} maxLength={FIELD_LIMITS.portfolioUrl} onChange={(event) => updateField("portfolioUrl", event.target.value)} type="url" placeholder="https://..." style={inputStyle(Boolean(errors.portfolioUrl))} />
                  </FormField>
                </div>

                <div style={{ marginTop: "18px", padding: "18px", borderRadius: "18px", border: `1px dashed ${errors.cv ? "rgba(255,126,126,0.55)" : "rgba(197,140,255,0.28)"}`, background: "rgba(197,140,255,0.035)" }}>
                  <strong style={{ fontSize: "13px" }}>CV / Resume · Optional</strong>
                  <p style={{ margin: "7px 0 0", color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>PDF only · Maximum 5 MB.</p>
                  {!cvFile ? (
                    <input ref={cvInputRef} onChange={handleCvChange} type="file" accept="application/pdf,.pdf" style={{ marginTop: "12px", color: "rgba(255,255,255,0.68)", fontSize: "12px" }} />
                  ) : (
                    <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
                      <span style={{ padding: "8px 11px", borderRadius: "12px", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.78)", fontSize: "12px" }}>
                        {cvFile.name} · {(cvFile.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <button type="button" onClick={removeCv} style={{ border: "none", background: "transparent", color: "#ffb0b0", fontSize: "11px", fontWeight: 800, cursor: "pointer" }}>
                        Remove
                      </button>
                    </div>
                  )}
                  {errors.cv && <p style={errorTextStyle}>{errors.cv}</p>}
                </div>

                <label style={{ marginTop: "18px", display: "flex", gap: "10px", alignItems: "flex-start", color: "rgba(255,255,255,0.62)", fontSize: "12px", lineHeight: 1.5 }}>
                  <input checked={form.consent} onChange={(event) => updateField("consent", event.target.checked)} type="checkbox" style={{ marginTop: "3px" }} />
                  <span>I agree that the information I provide may be used to review my Dreamscape Builders application and contact me about relevant project opportunities.</span>
                </label>
                {errors.consent && <p style={errorTextStyle}>{errors.consent}</p>}

                {errors.submit && (
                  <div role="alert" style={{ marginTop: "18px", padding: "14px 16px", borderRadius: "16px", border: "1px solid rgba(255,126,126,0.24)", background: "rgba(255,126,126,0.06)", color: "#ffc1c1", fontSize: "13px", lineHeight: 1.5 }}>
                    {errors.submit}
                  </div>
                )}

                <button disabled={submitState === "submitting"} type="submit" style={{ marginTop: "22px", minHeight: "50px", padding: "12px 20px", borderRadius: "999px", border: "none", background: submitState === "submitting" ? "rgba(255,255,255,0.16)" : "linear-gradient(90deg, #8ee8ff, #c58cff)", color: submitState === "submitting" ? "rgba(255,255,255,0.68)" : "#130725", fontSize: "10px", fontWeight: 900, letterSpacing: "0.09em", textTransform: "uppercase", cursor: submitState === "submitting" ? "wait" : "pointer" }}>
                  {submitState === "submitting" ? "Submitting…" : applicationMode === "interest" ? "Register Interest" : applicationMode === "pitch" ? "Submit Your Pitch" : "Submit Application"}
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      <footer
        style={{
          padding: isMobile ? "34px 20px" : "38px 6vw",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          background: "#01050c",
        }}
      >
        <div
          style={{
            maxWidth: "1380px",
            margin: "0 auto",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            gap: "20px",
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.48)", fontSize: "12px" }}>
            © {new Date().getFullYear()} Dreamscape One · Dreamscape Builders
          </span>
          <Link href="/" style={{ color: "#8ee8ff", textDecoration: "none", fontSize: "12px", fontWeight: 800 }}>
            Return to Dreamscape One →
          </Link>
        </div>
      </footer>
    </main>
  );
}


function FormField({
  label,
  hint,
  required = false,
  error,
  count,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  count?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: "8px" }}>
      <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", color: "rgba(255,255,255,0.76)", fontSize: "12px", fontWeight: 800 }}>
        <span>
          {label}
          {required ? <span style={{ color: "#8ee8ff" }}> *</span> : null}
          {hint ? <span style={{ marginLeft: "7px", color: "rgba(255,255,255,0.36)", fontWeight: 600 }}>{hint}</span> : null}
        </span>
        {count ? <span style={{ color: "rgba(255,255,255,0.34)", fontSize: "10px", fontWeight: 700 }}>{count}</span> : null}
      </span>
      {children}
      {error ? <span style={errorTextStyle}>{error}</span> : null}
    </label>
  );
}

function inputStyle(hasError = false, readOnly = false): CSSProperties {
  return {
    width: "100%",
    minHeight: "48px",
    padding: "11px 13px",
    borderRadius: "14px",
    border: hasError ? "1px solid rgba(255,126,126,0.58)" : "1px solid rgba(255,255,255,0.12)",
    background: readOnly ? "rgba(255,255,255,0.035)" : "rgba(3,10,23,0.72)",
    color: readOnly ? "rgba(255,255,255,0.72)" : "white",
    fontSize: "14px",
    outline: "none",
    opacity: readOnly ? 0.86 : 1,
  };
}

function textareaStyle(hasError = false): CSSProperties {
  return {
    ...inputStyle(hasError),
    minHeight: "116px",
    resize: "vertical",
    fontFamily: "Arial, Helvetica, sans-serif",
    lineHeight: 1.5,
  };
}

const errorTextStyle: CSSProperties = {
  margin: "2px 0 0",
  color: "#ffb0b0",
  fontSize: "11px",
  fontWeight: 700,
  lineHeight: 1.4,
};

function eyebrowStyle(accent: string): CSSProperties {
  return {
    margin: 0,
    color: accent,
    fontSize: "11px",
    fontWeight: 900,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
  };
}

function sectionHeadingStyle(isMobile: boolean): CSSProperties {
  return {
    margin: "17px 0 0",
    maxWidth: "900px",
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: isMobile ? "38px" : "54px",
    fontWeight: 400,
    lineHeight: 1.08,
  };
}

function sectionTextStyle(isMobile: boolean): CSSProperties {
  return {
    margin: "20px 0 0",
    maxWidth: "920px",
    color: "rgba(255,255,255,0.68)",
    fontSize: isMobile ? "15px" : "17px",
    fontWeight: 300,
    lineHeight: 1.7,
  };
}
