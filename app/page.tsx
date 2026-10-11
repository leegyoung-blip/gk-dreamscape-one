"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PublicPreviewBanner from "@/components/PublicPreviewBanner";

type Section = "home" | "about";


type Founding50FormData = {
  studentName: string;
  studentAge: string;
  email: string;
  consent: boolean;
};

type Founding50SubmissionState = "idle" | "submitting" | "success" | "error";

const FOUNDING_50_TERMS_VERSION = "founding50-v1";

type World = {
  key: "nova" | "milo";
  href: string;
  imageSrc: string;
  videoSrc: string;
};

const worlds: World[] = [
  {
    key: "nova",
    href: "/inventor",
    imageSrc: "/home/nova-world-cover.png",
    videoSrc: "/home/nova-world-preview.mp4",
  },
  {
    key: "milo",
    href: "/milo-world",
    imageSrc: "/home/milo-world-cover.png",
    videoSrc: "/home/milo-world-preview.mp4",
  },
];

const productPreviews = [
  {
    eyebrow: "Curriculum Missions",
    title: "Master the School Curriculum",
    text: "Build curriculum skills through progressive missions, topic challenges and meaningful practice designed to feel like part of the adventure.",
    imageSrc: "/home/preview-learning-missions.png",
    guideHref: "/explore/learning-missions",
    guideLabel: "How Learning Missions Work",
  },
  {
    eyebrow: "Explore & Upgrade",
    title: "Power Nova’s Rover",
    text: "Learning earns Dream Tokens and eligible Dream Gems that can unlock upgrades, strengthen Nova’s rover and open new experiences across Skyforge.",
    imageSrc: "/home/preview-rover.png",
    guideHref: "/explore/dream-tokens-and-gems",
    guideLabel: "How DT & DG Work",
  },
  {
    eyebrow: "Build Your World",
    title: "Make Nova’s World Your Own",
    text: "Use what you earn beyond the quiz screen. Furnish Nova’s home, unlock zones, collect items and return to a world that keeps growing with your progress.",
    imageSrc: "/home/preview-nova-home.png",
    guideHref: "/explore/novas-world",
    guideLabel: "Explore Nova’s World",
  },
];

const trustPoints = [
  {
    title: "AI-Assisted Development",
    text: "AI helps us develop, organise and improve learning content more efficiently.",
    imageSrc: "/home/trust-ai-development.png",
    placeholderLabel: "AI DEVELOPMENT",
  },
  {
    title: "Teacher Verification",
    text: "Qualified teachers review educational content before it reaches learners.",
    imageSrc: "/home/trust-teacher-review.png",
    placeholderLabel: "TEACHER REVIEW",
  },
  {
    title: "Continuously Improved",
    text: "Content is refined using teacher feedback, learner performance and curriculum updates.",
    imageSrc: "/home/trust-continuous-improvement.png",
    placeholderLabel: "CONTINUOUS IMPROVEMENT",
  },
];

function WorldPanel({
  world,
  isMobile,
  onHowItWorks,
}: {
  world: World;
  isMobile: boolean;
  onHowItWorks: () => void;
}) {
  const isNova = world.key === "nova";

  return (
    <article
      style={{
        position: "relative",
        minWidth: 0,
        height: isMobile ? (isNova ? "620px" : "430px") : "calc(100vh - 86px)",
        overflow: "hidden",
        color: "white",
        borderRight:
          isNova && !isMobile ? "1px solid rgba(255,255,255,0.14)" : "none",
        backgroundImage: `url(${world.imageSrc})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {world.videoSrc && (
        <video
          src={world.videoSrc}
          autoPlay
          muted
          playsInline
          loop
          preload="auto"
          poster={world.imageSrc}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 1,
          }}
        />
      )}

      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          background: isNova
            ? "linear-gradient(180deg, rgba(1,6,15,0.06) 14%, rgba(1,6,15,0.18) 45%, rgba(1,6,15,0.94) 100%)"
            : "linear-gradient(180deg, rgba(1,6,15,0.12) 10%, rgba(1,6,15,0.34) 48%, rgba(1,6,15,0.96) 100%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 3,
          background: isNova
            ? "radial-gradient(circle at 35% 45%, rgba(83,215,255,0.1), transparent 34%)"
            : "radial-gradient(circle at 55% 46%, rgba(197,140,255,0.1), transparent 36%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          zIndex: 5,
          left: isMobile ? "24px" : isNova ? "clamp(48px, 5.4vw, 96px)" : "clamp(28px, 2.5vw, 48px)",
          right: isMobile ? "24px" : isNova ? "clamp(48px, 5vw, 90px)" : "clamp(24px, 2.4vw, 44px)",
          bottom: isMobile ? "34px" : isNova ? "42px" : "66px",
          maxWidth: isNova ? "760px" : "500px",
        }}
      >
        <p
          style={{
            margin: 0,
            color: isNova ? "#8ee8ff" : "#d5b5ff",
            fontSize: isMobile ? "11px" : "12px",
            fontWeight: 900,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          {isNova ? "Ages 6–12 · Nova’s World" : "Real-World Skills · Milo’s World"}
        </p>

        <h1
          style={{
            margin: "13px 0 0",
            maxWidth: isNova ? "760px" : "470px",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: isMobile
              ? isNova
                ? "42px"
                : "38px"
              : isNova
                ? "clamp(44px, 4vw, 68px)"
                : "clamp(34px, 2.9vw, 50px)",
            fontWeight: 400,
            lineHeight: isNova ? 1.02 : 1.06,
            letterSpacing: "-0.01em",
            color: "white",
            textShadow: "0 16px 46px rgba(0,0,0,0.62)",
          }}
        >
          {isNova ? "Turn Learning Into Adventure" : "The Adventure Grows With Them"}
        </h1>

        <p
          style={{
            margin: isNova ? "20px 0 0" : "17px 0 0",
            maxWidth: isNova ? "700px" : "450px",
            color: "rgba(255,255,255,0.9)",
            fontSize: isMobile ? "17px" : isNova ? "20px" : "17px",
            fontWeight: 300,
            lineHeight: 1.55,
            textShadow: "0 10px 30px rgba(0,0,0,0.65)",
          }}
        >
          {isNova
            ? "Build strong school foundations and thinking skills through missions, games and rewards in a world built for curious minds."
            : "Continue into financial literacy, business, entrepreneurship and real-world decision-making."}
        </p>

        {isNova ? (
          <>
            <div
              style={{
                marginTop: "22px",
                display: "flex",
                flexWrap: "wrap",
                gap: "11px",
              }}
            >
              <Link
                href={world.href}
                style={{
                  minHeight: "48px",
                  padding: "12px 20px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "999px",
                  background: "linear-gradient(90deg, #8ee8ff, #bca0ff)",
                  color: "#100622",
                  textDecoration: "none",
                  fontSize: "11px",
                  fontWeight: 900,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  boxShadow: "0 16px 38px rgba(83,215,255,0.18)",
                }}
              >
                Explore Nova →
              </Link>

              <button
                type="button"
                onClick={onHowItWorks}
                style={{
                  minHeight: "48px",
                  padding: "12px 20px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.38)",
                  background: "rgba(3,10,23,0.38)",
                  color: "white",
                  fontSize: "11px",
                  fontWeight: 900,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  backdropFilter: "blur(10px)",
                }}
              >
                See How It Works
              </button>
            </div>
          </>
        ) : (
          <>
            <p
              style={{
                margin: "18px 0 0",
                color: "rgba(255,255,255,0.67)",
                fontSize: "13px",
                lineHeight: 1.5,
                fontWeight: 700,
              }}
            >
              Financial Literacy · Business · Entrepreneurship
            </p>

            <p
              style={{
                margin: "7px 0 0",
                maxWidth: "440px",
                color: "rgba(255,255,255,0.55)",
                fontSize: "12px",
                lineHeight: 1.5,
                fontWeight: 400,
              }}
            >
              Explore money, business and decision-making at a pace that grows with each learner.
            </p>

            <div
              style={{
                marginTop: "23px",
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                alignItems: "center",
              }}
            >
              <Link
                href={world.href}
                style={{
                  minHeight: "46px",
                  padding: "11px 18px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "999px",
                  border: "1px solid rgba(213,181,255,0.42)",
                  background: "rgba(7,7,18,0.42)",
                  color: "white",
                  textDecoration: "none",
                  fontSize: "10px",
                  fontWeight: 900,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  backdropFilter: "blur(10px)",
                }}
              >
                Explore Milo →
              </Link>


            </div>
          </>
        )}
      </div>
    </article>
  );
}

export default function Home() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAccount, setIsCheckingAccount] = useState(true);
  const [showFounding50Banner, setShowFounding50Banner] = useState(false);
  const [isFounding50ModalOpen, setIsFounding50ModalOpen] = useState(false);
  const [founding50Form, setFounding50Form] = useState<Founding50FormData>({
    studentName: "",
    studentAge: "",
    email: "",
    consent: false,
  });
  const [founding50SubmissionState, setFounding50SubmissionState] =
    useState<Founding50SubmissionState>("idle");
  const [founding50Error, setFounding50Error] = useState("");

  useEffect(() => {
    function checkScreenSize() {
      setIsMobile(window.innerWidth <= 900);
    }

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;
      setIsLoggedIn(Boolean(session?.user));
      setIsCheckingAccount(false);
    }

    void checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
      setIsCheckingAccount(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMenuOpen(false);
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const dismissed = window.sessionStorage.getItem("dreamscape-founding50-banner-dismissed");
    setShowFounding50Banner(dismissed !== "1");
  }, []);

  useEffect(() => {
    if (!isFounding50ModalOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsFounding50ModalOpen(false);
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFounding50ModalOpen]);

  useEffect(() => {
    if (!showFounding50Banner) return;
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") dismissFounding50Banner();
    }
    window.addEventListener("keydown", dismissOnEscape);
    return () => window.removeEventListener("keydown", dismissOnEscape);
    // The dismissal handler only changes state/sessionStorage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFounding50Banner]);

  function scrollToSection(section: Section) {
    scrollToId(section === "home" ? "home" : "about");
  }

  function scrollToId(targetId: string) {
    setIsMenuOpen(false);

    window.setTimeout(() => {
      const target = document.getElementById(targetId);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  }

  function openFounding50Modal() {
    dismissFounding50Banner();
    setFounding50Error("");
    setFounding50SubmissionState("idle");
    setIsFounding50ModalOpen(true);
  }

  function closeFounding50Modal() {
    setIsFounding50ModalOpen(false);
  }

  function dismissFounding50Banner() {
    setShowFounding50Banner(false);
    window.sessionStorage.setItem("dreamscape-founding50-banner-dismissed", "1");
  }

  async function handleFounding50Submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!founding50Form.consent) {
      setFounding50SubmissionState("error");
      setFounding50Error("Please confirm that you are the student's parent or legal guardian.");
      return;
    }

    if (!founding50Form.studentAge) {
      setFounding50SubmissionState("error");
      setFounding50Error("Please choose the student's age (6–12).");
      return;
    }

    setFounding50SubmissionState("submitting");
    setFounding50Error("");

    try {
      const response = await fetch("/api/founding-50/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentName: founding50Form.studentName,
          studentAge: founding50Form.studentAge,
          email: founding50Form.email,
          consentAccepted: founding50Form.consent,
          termsVersion: FOUNDING_50_TERMS_VERSION,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setFounding50SubmissionState("error");
        setFounding50Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Something went wrong while submitting your interest. Please try again."
        );
        return;
      }

      setFounding50SubmissionState("success");
      setFounding50Form({
        studentName: "",
        studentAge: "",
        email: "",
        consent: false,
      });
    } catch (error) {
      setFounding50SubmissionState("error");
      setFounding50Error("Unable to submit right now. Please try again in a moment.");
    }
  }

  const footerLinkStyle: CSSProperties = {
    color: "rgba(255,255,255,0.68)",
    textDecoration: "none",
    fontSize: "15px",
    fontWeight: 300,
    lineHeight: 1.4,
    transition: "color 220ms ease",
  };


  return (
    <main
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#020813",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
        overflowX: "hidden",
        scrollBehavior: "smooth",
      }}
    >
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          height: isMobile ? "72px" : "86px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: isMobile ? "10px" : "24px",
          padding: isMobile ? "0 12px" : "0 43px",
          background: "rgba(2,8,19,0.92)",
          borderBottom: "1px solid rgba(255,255,255,0.14)",
          backdropFilter: "blur(18px)",
        }}
      >
        <button
          type="button"
          onClick={() => scrollToId("home")}
          aria-label="Go to homepage"
          style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? "9px" : "19px",
            color: "white",
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            minWidth: 0,
            flexShrink: 1,
          }}
        >
          <img
            src="/home/dreamscape-logo.png"
            alt="Dreamscape One logo"
            style={{
              width: isMobile ? "38px" : "54px",
              height: isMobile ? "38px" : "54px",
              objectFit: "contain",
              display: "block",
              borderRadius: "999px",
              flexShrink: 0,
              boxShadow:
                "0 0 18px rgba(197,140,255,0.32), 0 0 22px rgba(255,138,43,0.18)",
            }}
          />

          <span
            style={{
              fontSize: isMobile ? "10px" : "18px",
              fontWeight: 400,
              letterSpacing: isMobile ? "1.8px" : "8px",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            DREAMSCAPE ONE
          </span>
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: isMobile ? "7px" : "12px",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={isMenuOpen}
            style={{
              width: isMobile ? "38px" : "44px",
              height: isMobile ? "38px" : "44px",
              borderRadius: "999px",
              border: "1px solid rgba(142,232,255,0.32)",
              background:
                "linear-gradient(135deg, rgba(83,215,255,0.12), rgba(197,140,255,0.12))",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              cursor: "pointer",
              boxShadow: "0 10px 30px rgba(0,0,0,0.24)",
            }}
          >
            {[0, 1, 2].map((line) => (
              <span
                key={line}
                style={{
                  width: isMobile ? "16px" : "18px",
                  height: "1.5px",
                  borderRadius: "999px",
                  background: "white",
                  display: "block",
                }}
              />
            ))}
          </button>

          <button
            type="button"
            onClick={() => router.push(isLoggedIn ? "/profile" : "/login")}
            style={{
              background: "rgba(255,255,255,0.94)",
              color: "#24124d",
              border: "1px solid rgba(255,255,255,0.45)",
              borderRadius: "999px",
              padding: isMobile ? "9px 10px" : "11px 22px",
              minWidth: isMobile ? "70px" : "138px",
              fontSize: isMobile ? "8px" : "12px",
              fontWeight: 800,
              letterSpacing: isMobile ? "0.05em" : "0.1em",
              cursor: "pointer",
              whiteSpace: "nowrap",
              textAlign: "center",
              boxShadow: "0 10px 30px rgba(20,10,60,0.18)",
              backdropFilter: "blur(14px)",
            }}
          >
            {isCheckingAccount ? "..." : isLoggedIn ? "ACCOUNT" : "LOG IN"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/cart")}
            aria-label="Cart"
            style={{
              width: isMobile ? "38px" : "44px",
              height: isMobile ? "38px" : "44px",
              borderRadius: "999px",
              background: "#05050a",
              border: "1px solid rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              flexShrink: 0,
            }}
          >
            <svg
              width={isMobile ? "17" : "20"}
              height={isMobile ? "17" : "20"}
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L23 6H6" />
            </svg>
          </button>
        </div>
      </header>

      {isMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setIsMenuOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 70,
              border: "none",
              padding: 0,
              background: "rgba(0,0,0,0.58)",
              backdropFilter: "blur(8px)",
              cursor: "pointer",
            }}
          />

          <aside
            aria-label="Dreamscape One navigation"
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              zIndex: 80,
              width: isMobile ? "min(88vw, 390px)" : "420px",
              padding: isMobile ? "24px 22px 30px" : "32px 34px 40px",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              color: "white",
              borderLeft: "1px solid rgba(142,232,255,0.22)",
              background:
                "radial-gradient(circle at 100% 0%, rgba(197,140,255,0.18), transparent 32%), radial-gradient(circle at 0% 100%, rgba(83,215,255,0.13), transparent 34%), rgba(3,10,23,0.98)",
              boxShadow: "-24px 0 70px rgba(0,0,0,0.44)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <img src="/home/dreamscape-logo.png" alt="" aria-hidden="true" style={{ width: "42px", height: "42px", objectFit: "contain", borderRadius: "999px" }} />
                <span style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                  Explore Dreamscape
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                aria-label="Close navigation menu"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  fontSize: "24px",
                  lineHeight: 1,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <nav aria-label="Main navigation" style={{ marginTop: isMobile ? "30px" : "42px", display: "flex", flexDirection: "column" }}>
              <button
                type="button"
                onClick={() => { setExpandedMenu(null); scrollToId("home"); }}
                style={{
                  minHeight: "60px", padding: "0 4px", display: "flex", alignItems: "center",
                  justifyContent: "space-between", border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.1)", background: "transparent",
                  color: "white", fontSize: isMobile ? "15px" : "16px", fontWeight: 800,
                  letterSpacing: "0.07em", textAlign: "left", cursor: "pointer",
                }}
              >
                HOME <span aria-hidden="true" style={{ color: "#8ee8ff" }}>→</span>
              </button>

              {[
                {
                  label: "EXPLORE",
                  items: [
                    { label: "How Dreamscape Works", href: "/how-it-works" },
                    { label: "Nova's World", href: "/inventor" },
                    { label: "Milo's World", href: "/milo-world" },
                    { label: "Explore Dreamscape Guides", href: "/explore" },
                  ],
                },
                {
                  label: "FOR FAMILIES",
                  items: [
                    { label: "NOVA+ for Parents", href: "/explore/nova-plus" },
                    { label: "Pricing & Plans", href: "/pricing" },
                  ],
                },
                {
                  label: "FOR ORGANISATIONS",
                  items: [
                    { label: "For Tuition Centres", href: "/education-licence" },
                    { label: "Partner With Us", href: "/affiliate" },
                  ],
                },
              ].map((group) => {
                const isExpanded = expandedMenu === group.label;
                const panelId = `dreamscape-menu-${group.label.toLowerCase().replace(/\s+/g, "-")}`;
                return (
                  <div key={group.label} style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={panelId}
                      onClick={() => setExpandedMenu(isExpanded ? null : group.label)}
                      style={{
                        width: "100%", minHeight: "60px", padding: "0 4px", display: "flex",
                        alignItems: "center", justifyContent: "space-between", gap: "18px",
                        background: "transparent", border: "none", color: "white",
                        fontSize: isMobile ? "15px" : "16px", fontWeight: 800,
                        letterSpacing: "0.07em", textAlign: "left", cursor: "pointer",
                      }}
                    >
                      {group.label}
                      <span aria-hidden="true" style={{ color: "#c58cff", fontSize: "22px", fontWeight: 400 }}>
                        {isExpanded ? "−" : "+"}
                      </span>
                    </button>
                    <div id={panelId} hidden={!isExpanded}>
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => { setIsMenuOpen(false); setExpandedMenu(null); }}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            gap: "14px", minHeight: "46px", padding: "10px 4px 10px 18px",
                            color: "rgba(255,255,255,0.78)", textDecoration: "none",
                            fontSize: "14px", lineHeight: 1.4, fontWeight: 500,
                          }}
                        >
                          {item.label}
                          <span aria-hidden="true" style={{ color: "#c58cff" }}>→</span>
                        </Link>
                      ))}
                      <div style={{ height: "10px" }} />
                    </div>
                  </div>
                );
              })}

              <Link
                href="/join-us"
                onClick={() => { setIsMenuOpen(false); setExpandedMenu(null); }}
                style={{
                  minHeight: "60px", padding: "0 4px", display: "flex", alignItems: "center",
                  justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.1)",
                  color: "white", textDecoration: "none", fontSize: isMobile ? "15px" : "16px",
                  fontWeight: 800, letterSpacing: "0.07em",
                }}
              >
                DREAMSCAPE BUILDERS <span aria-hidden="true" style={{ color: "#c58cff" }}>→</span>
              </Link>
            </nav>

            <div style={{ marginTop: "auto", paddingTop: "30px" }}>
              <Link
                href="/pricing"
                onClick={() => { setIsMenuOpen(false); setExpandedMenu(null); }}
                style={{
                  minHeight: "52px", padding: "13px 18px", display: "flex", alignItems: "center",
                  justifyContent: "center", borderRadius: "999px",
                  background: "linear-gradient(90deg, #8ee8ff, #c58cff)",
                  color: "#140725", textDecoration: "none", textAlign: "center",
                  fontSize: "12px", fontWeight: 900, letterSpacing: "0.06em",
                }}
              >
                VIEW PLANS &amp; START TRIAL →
              </Link>
            </div>

            <p
              style={{
                margin: "auto 0 0",
                paddingTop: "34px",
                color: "rgba(255,255,255,0.48)",
                fontSize: "13px",
                lineHeight: 1.6,
              }}
            >
              One connected learning ecosystem for school mastery, thinking, financial literacy and entrepreneurship.
            </p>
          </aside>
        </>
      )}

      {showFounding50Banner && !isFounding50ModalOpen && (
        <Founding50Announcement
          isMobile={isMobile}
          onRegister={openFounding50Modal}
          onDismiss={dismissFounding50Banner}
        />
      )}

      {isFounding50ModalOpen && (
        <Founding50InterestModal
          isMobile={isMobile}
          submissionState={founding50SubmissionState}
          errorMessage={founding50Error}
          formData={founding50Form}
          onClose={closeFounding50Modal}
          onChange={(field, value) =>
            setFounding50Form((current) => ({ ...current, [field]: value }))
          }
          onSubmit={handleFounding50Submit}
        />
      )}

      <section
        id="home"
        style={{
          position: "relative",
          width: "100vw",
          minHeight: "100vh",
          paddingTop: isMobile ? "72px" : "86px",
          background: "#020813",
        }}
      >
        <PublicPreviewBanner />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 7fr) minmax(330px, 3fr)",
            gridTemplateRows: "1fr",
            background: "#020813",
          }}
        >
          <WorldPanel world={worlds[0]} isMobile={isMobile} onHowItWorks={() => router.push("/how-it-works")} />
          <WorldPanel world={worlds[1]} isMobile={isMobile} onHowItWorks={() => router.push("/how-it-works")} />
        </div>
      </section>

      <section
        id="about"
        style={{
          position: "relative",
          padding: isMobile ? "88px 20px 80px" : "126px 7.2vw 118px",
          background:
            "radial-gradient(circle at 50% 0%, rgba(83,215,255,0.15), transparent 30%), radial-gradient(circle at 80% 42%, rgba(197,140,255,0.1), transparent 30%), #020813",
          color: "white",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "relative",
            zIndex: 2,
            width: "100%",
            maxWidth: "1450px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <section
            id="how-it-works"
            aria-labelledby="inside-nova-heading"
            style={{
              width: "100%",
              scrollMarginTop: isMobile ? "92px" : "108px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#8ee8ff",
                fontSize: "13px",
                fontWeight: 800,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
              }}
            >
              See Inside Nova
            </p>

            <h2
              id="inside-nova-heading"
              style={{
                margin: "20px 0 0",
                maxWidth: "1080px",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "42px" : "64px",
                fontWeight: 400,
                lineHeight: 1.06,
                color: "white",
              }}
            >
              Practice shouldn’t feel like more homework.
            </h2>

            <p
              style={{
                margin: "23px 0 0",
                maxWidth: "900px",
                color: "rgba(255,255,255,0.72)",
                fontSize: isMobile ? "17px" : "20px",
                fontWeight: 300,
                lineHeight: 1.72,
              }}
            >
              Children still need meaningful practice. DREAMSCAPE turns it into missions, upgrades and spaces they have a reason to return to — so curriculum learning feels connected to a larger adventure.
            </p>

            <div
              style={{
                marginTop: isMobile ? "38px" : "52px",
                width: "100%",
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
                gap: isMobile ? "22px" : "26px",
                alignItems: "stretch",
              }}
            >
              {productPreviews.map((preview) => (
                <ProductPreviewCard key={preview.title} {...preview} />
              ))}
            </div>

            <Link
              href="/explore/novas-world"
              style={{
                marginTop: "28px",
                color: "#8ee8ff",
                textDecoration: "none",
                fontSize: "13px",
                fontWeight: 900,
                letterSpacing: "0.04em",
              }}
            >
              See how learning connects across Nova’s World →
            </Link>
          </section>

          <section
            aria-labelledby="grows-heading"
            style={{
              position: "relative",
              marginTop: isMobile ? "84px" : "116px",
              width: "100vw",
              marginLeft: "calc(50% - 50vw)",
              marginRight: "calc(50% - 50vw)",
              padding: isMobile ? "72px 20px 76px" : "96px 5vw 102px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              background: isMobile
                ? "linear-gradient(180deg, #38145f 0%, #6d287d 42%, #b55261 72%, #ef7d36 100%)"
                : "linear-gradient(105deg, #351259 0%, #64257e 30%, #9c3f72 57%, #d85e4d 78%, #f28b37 100%)",
              boxShadow: "inset 0 1px rgba(255,255,255,0.08), inset 0 -1px rgba(255,255,255,0.08)",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background:
                  "radial-gradient(circle at 12% 35%, rgba(192,134,255,0.22), transparent 26%), radial-gradient(circle at 88% 55%, rgba(255,199,112,0.22), transparent 28%), linear-gradient(180deg, rgba(5,5,18,0.08), rgba(5,5,18,0.2))",
              }}
            />

            <div
              style={{
                position: "relative",
                zIndex: 2,
                width: "100%",
                maxWidth: "1540px",
                margin: "0 auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "rgba(255,255,255,0.82)",
                  fontSize: "13px",
                  fontWeight: 900,
                  letterSpacing: "0.27em",
                  textTransform: "uppercase",
                }}
              >
                One Connected Ecosystem
              </p>

              <h2
                id="grows-heading"
                style={{
                  margin: "20px 0 0",
                  maxWidth: "1040px",
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: isMobile ? "42px" : "64px",
                  fontWeight: 400,
                  lineHeight: 1.06,
                  color: "white",
                  textShadow: "0 12px 34px rgba(39,9,46,0.24)",
                }}
              >
                A world that grows with them.
              </h2>

              <p
                style={{
                  margin: "23px 0 0",
                  maxWidth: "900px",
                  color: "rgba(255,255,255,0.82)",
                  fontSize: isMobile ? "17px" : "20px",
                  fontWeight: 300,
                  lineHeight: 1.68,
                }}
              >
                Start with school mastery in Nova. Grow into money, business and real-world decision-making with Milo.
              </p>

              <GrowthJourney isMobile={isMobile} />

              <Link
                href="/explore/from-learning-to-real-world-decisions"
                style={{
                  marginTop: "34px",
                  color: "white",
                  textDecoration: "none",
                  fontSize: "13px",
                  fontWeight: 900,
                  letterSpacing: "0.04em",
                  textShadow: "0 8px 24px rgba(39,9,46,0.3)",
                }}
              >
                Why Dreamscape connects curriculum to real-world decisions →
              </Link>
            </div>
          </section>

          <section
            id="for-parents"
            aria-labelledby="parents-heading"
            style={{
              marginTop: isMobile ? "88px" : "120px",
              width: "100%",
              scrollMarginTop: isMobile ? "92px" : "108px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#8ee8ff",
                fontSize: "13px",
                fontWeight: 900,
                letterSpacing: "0.27em",
                textTransform: "uppercase",
              }}
            >
              For Parents · Powered by NOVA+
            </p>

            <h2
              id="parents-heading"
              style={{
                margin: "20px 0 0",
                maxWidth: "1120px",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "42px" : "62px",
                fontWeight: 400,
                lineHeight: 1.07,
                color: "white",
              }}
            >
              Know how your child is learning — not just what they scored.
            </h2>

            <p
              style={{
                margin: "23px 0 0",
                maxWidth: "960px",
                color: "rgba(255,255,255,0.72)",
                fontSize: isMobile ? "17px" : "19px",
                fontWeight: 300,
                lineHeight: 1.72,
              }}
            >
              NOVA+ turns learning activity into an evolving picture of progress, strengths, gaps and mastery — helping families understand what is happening now and what should come next.
            </p>

            <div
              style={{
                marginTop: isMobile ? "34px" : "42px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                padding: isMobile ? "12px 16px" : "13px 20px",
                borderRadius: "999px",
                border: "1px solid rgba(142,232,255,0.3)",
                background: "linear-gradient(90deg, rgba(83,215,255,0.1), rgba(197,140,255,0.1))",
                color: "rgba(255,255,255,0.9)",
                fontSize: isMobile ? "12px" : "13px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              <span aria-hidden="true" style={{ color: "#8ee8ff" }}>✦</span>
              NOVA+ Learning Intelligence
            </div>

            <Link
              href="/explore/nova-plus"
              style={{
                marginTop: "20px",
                color: "#8ee8ff",
                textDecoration: "none",
                fontSize: "13px",
                fontWeight: 900,
                letterSpacing: "0.04em",
              }}
            >
              Read the parent’s guide to NOVA+ →
            </Link>

            <div
              style={{
                marginTop: isMobile ? "36px" : "52px",
                width: "100%",
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "0.82fr 1.18fr",
                alignItems: "stretch",
                overflow: "hidden",
                borderRadius: isMobile ? "26px" : "34px",
                border: "1px solid rgba(83,215,255,0.24)",
                background:
                  "radial-gradient(circle at 8% 18%, rgba(83,215,255,0.11), transparent 30%), linear-gradient(145deg, rgba(7,23,43,0.96), rgba(8,8,29,0.96))",
                boxShadow: "0 30px 78px rgba(0,0,0,0.32)",
              }}
            >
              <div
                style={{
                  padding: isMobile ? "32px 24px" : "50px 44px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  textAlign: "left",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#8ee8ff",
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  My Learning
                </p>
                <h3
                  style={{
                    margin: "15px 0 0",
                    color: "white",
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: isMobile ? "32px" : "43px",
                    fontWeight: 400,
                    lineHeight: 1.08,
                  }}
                >
                  A clearer picture every week.
                </h3>
                <p
                  style={{
                    margin: "19px 0 0",
                    color: "rgba(255,255,255,0.68)",
                    fontSize: isMobile ? "15px" : "17px",
                    fontWeight: 300,
                    lineHeight: 1.7,
                  }}
                >
                  Bring recent activity, subject performance and learning signals together in one place so families can see how learning is developing over time.
                </p>
                <div
                  style={{
                    marginTop: "24px",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "9px",
                  }}
                >
                  {["Weekly progress", "Learning profile", "Subject signals"].map((label) => (
                    <span
                      key={label}
                      style={{
                        padding: "8px 11px",
                        borderRadius: "999px",
                        border: "1px solid rgba(142,232,255,0.18)",
                        background: "rgba(83,215,255,0.06)",
                        color: "rgba(255,255,255,0.76)",
                        fontSize: "11px",
                        fontWeight: 800,
                      }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div
                style={{
                  minHeight: isMobile ? "320px" : "480px",
                  padding: isMobile ? "12px" : "18px",
                  display: "flex",
                  alignItems: "stretch",
                  background: "rgba(0,0,0,0.18)",
                  borderLeft: isMobile ? "none" : "1px solid rgba(142,232,255,0.12)",
                  borderTop: isMobile ? "1px solid rgba(142,232,255,0.12)" : "none",
                }}
              >
                <NovaPlusScreenshot
                  label="MY LEARNING"
                  filename="/home/nova-plus-my-learning.png"
                  accent="#8ee8ff"
                />
              </div>
            </div>

            <div
              style={{
                marginTop: isMobile ? "22px" : "28px",
                width: "100%",
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: isMobile ? "20px" : "24px",
                alignItems: "stretch",
              }}
            >
              <NovaPlusFeatureCard
                eyebrow="Strengths & Gaps"
                title="Find the gaps before they grow."
                text="See performance at concept level rather than relying on one overall score, making it easier to understand exactly where extra practice may help."
                filename="/home/nova-plus-strengths-gaps.png"
                accent="#8ee8ff"
              />
              <NovaPlusFeatureCard
                eyebrow="Mastery Map"
                title="Watch mastery develop over time."
                text="Connect evidence across the curriculum so parents can see which areas are developing, secure or still need attention."
                filename="/home/nova-plus-mastery-map.png"
                accent="#c58cff"
              />
            </div>

            <div
              style={{
                marginTop: isMobile ? "22px" : "28px",
                width: "100%",
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "0.74fr 1.26fr",
                alignItems: "stretch",
                overflow: "hidden",
                borderRadius: isMobile ? "26px" : "34px",
                border: "1px solid rgba(255,174,92,0.28)",
                background:
                  "radial-gradient(circle at 8% 20%, rgba(255,174,92,0.12), transparent 34%), linear-gradient(145deg, rgba(28,13,33,0.96), rgba(8,10,28,0.96))",
                boxShadow: "0 30px 78px rgba(0,0,0,0.3)",
              }}
            >
              <div
                style={{
                  padding: isMobile ? "32px 24px" : "48px 42px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  textAlign: "left",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#ffbd73",
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  Learning Reports
                </p>
                <h3
                  style={{
                    margin: "15px 0 0",
                    color: "white",
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: isMobile ? "32px" : "42px",
                    fontWeight: 400,
                    lineHeight: 1.08,
                  }}
                >
                  Progress you can take with you.
                </h3>
                <p
                  style={{
                    margin: "19px 0 0",
                    color: "rgba(255,255,255,0.68)",
                    fontSize: isMobile ? "15px" : "17px",
                    fontWeight: 300,
                    lineHeight: 1.7,
                  }}
                >
                  Download a clear NOVA+ learning report whenever you want a deeper view of progress, strengths and areas to support next.
                </p>
              </div>

              <div
                style={{
                  minHeight: isMobile ? "320px" : "430px",
                  padding: isMobile ? "12px" : "18px",
                  display: "flex",
                  alignItems: "stretch",
                  background: "rgba(0,0,0,0.16)",
                  borderLeft: isMobile ? "none" : "1px solid rgba(255,174,92,0.12)",
                  borderTop: isMobile ? "1px solid rgba(255,174,92,0.12)" : "none",
                }}
              >
                <NovaPlusScreenshot
                  label="REPORT DOWNLOAD"
                  filename="/home/nova-plus-report.png"
                  accent="#ffbd73"
                />
              </div>
            </div>
          </section>

          <section
            id="milo-finance"
            aria-labelledby="milo-finance-heading"
            style={{
              position: "relative",
              marginTop: isMobile ? "88px" : "120px",
              width: "100vw",
              marginLeft: "calc(50% - 50vw)",
              marginRight: "calc(50% - 50vw)",
              padding: isMobile ? "78px 20px 82px" : "104px 6vw 112px",
              overflow: "hidden",
              scrollMarginTop: isMobile ? "92px" : "108px",
              background:
                "radial-gradient(circle at 12% 12%, rgba(44,205,139,0.18), transparent 28%), radial-gradient(circle at 88% 78%, rgba(255,204,92,0.15), transparent 30%), linear-gradient(145deg, #061713 0%, #071b20 48%, #151523 100%)",
              borderTop: "1px solid rgba(123,243,183,0.16)",
              borderBottom: "1px solid rgba(255,211,110,0.13)",
            }}
          >
            <div
              style={{
                position: "relative",
                zIndex: 2,
                width: "100%",
                maxWidth: "1450px",
                margin: "0 auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "9px",
                  padding: "9px 13px",
                  borderRadius: "999px",
                  border: "1px solid rgba(123,243,183,0.28)",
                  background: "rgba(44,205,139,0.08)",
                }}
              >
                <span aria-hidden="true" style={{ width: "7px", height: "7px", borderRadius: "999px", background: "#7bf3b7", boxShadow: "0 0 16px rgba(123,243,183,0.6)" }} />
                <span style={{ color: "#9cf6c9", fontSize: "11px", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>
                  Milo Finance · Coming Soon
                </span>
              </div>

              <h2
                id="milo-finance-heading"
                style={{
                  margin: "22px 0 0",
                  maxWidth: "1080px",
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: isMobile ? "42px" : "64px",
                  fontWeight: 400,
                  lineHeight: 1.06,
                  color: "white",
                }}
              >
                Learn money by actually using it.
              </h2>

              <p
                style={{
                  margin: "23px 0 0",
                  maxWidth: "920px",
                  color: "rgba(255,255,255,0.73)",
                  fontSize: isMobile ? "17px" : "20px",
                  fontWeight: 300,
                  lineHeight: 1.72,
                }}
              >
                Milo Finance turns financial literacy into something learners can practise. Learn money skills in Milo’s Bank, build a business, explore markets and make property decisions across one connected Dreamscape experience.
              </p>

              <div
                style={{
                  marginTop: isMobile ? "36px" : "46px",
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))",
                  gap: isMobile ? "18px" : "20px",
                  alignItems: "stretch",
                }}
              >
                {[
                  {
                    eyebrow: "Learn",
                    title: "Milo’s Bank",
                    text: "Interactive financial literacy lessons covering saving, spending, budgeting, interest, risk and smarter money decisions.",
                    accent: "#7bf3b7",
                  },
                  {
                    eyebrow: "Build",
                    title: "Business Builder",
                    text: "Create and grow a Dreamscape business through pricing, costs, products, customers and entrepreneurship decisions.",
                    accent: "#ffd36e",
                  },
                  {
                    eyebrow: "Apply",
                    title: "Milo’s Exchange",
                    text: "Unlock exclusive finance lessons that connect investing and market concepts directly to the simulated Dreamscape economy.",
                    accent: "#8ee8ff",
                  },
                  {
                    eyebrow: "Own & Manage",
                    title: "Property Benefits",
                    text: "Get early access to selected property launches plus additional development and upgrade options inside the Property Exchange.",
                    accent: "#c9a2ff",
                  },
                ].map((feature) => (
                  <article
                    key={feature.title}
                    style={{
                      minHeight: isMobile ? "auto" : "292px",
                      padding: isMobile ? "27px 23px" : "31px 27px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      textAlign: "left",
                      borderRadius: "26px",
                      border: `1px solid ${feature.accent}33`,
                      background: "linear-gradient(145deg, rgba(255,255,255,0.065), rgba(255,255,255,0.018))",
                      boxShadow: "0 24px 64px rgba(0,0,0,0.24)",
                    }}
                  >
                    <p style={{ margin: 0, color: feature.accent, fontSize: "11px", fontWeight: 900, letterSpacing: "0.17em", textTransform: "uppercase" }}>
                      {feature.eyebrow}
                    </p>
                    <h3 style={{ margin: "15px 0 0", color: "white", fontSize: isMobile ? "27px" : "30px", fontWeight: 800, lineHeight: 1.16 }}>
                      {feature.title}
                    </h3>
                    <p style={{ margin: "17px 0 0", color: "rgba(255,255,255,0.67)", fontSize: "15px", fontWeight: 300, lineHeight: 1.68 }}>
                      {feature.text}
                    </p>
                  </article>
                ))}
              </div>

              <div
                style={{
                  marginTop: isMobile ? "32px" : "40px",
                  width: "100%",
                  maxWidth: "960px",
                  padding: isMobile ? "22px 20px" : "23px 28px",
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  alignItems: isMobile ? "stretch" : "center",
                  justifyContent: "space-between",
                  gap: isMobile ? "18px" : "26px",
                  borderRadius: "24px",
                  border: "1px solid rgba(123,243,183,0.24)",
                  background: "linear-gradient(100deg, rgba(44,205,139,0.1), rgba(255,211,110,0.07))",
                  textAlign: "left",
                }}
              >
                <div>
                  <p style={{ margin: 0, color: "#7bf3b7", fontSize: "10px", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                    One Milo Finance Membership
                  </p>
                  <div style={{ marginTop: "7px", display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ color: "white", fontSize: isMobile ? "31px" : "36px", fontWeight: 900, lineHeight: 1 }}>
                      SGD 12.90
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px", fontWeight: 700 }}>/month</span>
                    <span style={{ color: "#ffd36e", fontSize: "11px", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>Coming Soon</span>
                  </div>
                </div>


              </div>
            </div>
          </section>

          <section
            id="quality-trust"
            aria-labelledby="trust-heading"
            style={{
              position: "relative",
              marginTop: isMobile ? "84px" : "112px",
              scrollMarginTop: isMobile ? "92px" : "108px",
              width: "100%",
              padding: isMobile ? "56px 20px 50px" : "76px 54px 62px",
              borderRadius: isMobile ? "28px" : "38px",
              overflow: "hidden",
              border: "1px solid rgba(142,232,255,0.3)",
              background:
                "radial-gradient(circle at 10% 12%, rgba(83,215,255,0.18), transparent 30%), radial-gradient(circle at 92% 88%, rgba(197,140,255,0.18), transparent 32%), linear-gradient(145deg, rgba(8,24,45,0.94), rgba(13,8,35,0.96))",
              boxShadow:
                "0 34px 88px rgba(0,0,0,0.38), inset 0 0 36px rgba(83,215,255,0.035)",
            }}
          >
            <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <p style={{ margin: 0, color: "#8ee8ff", fontSize: "13px", fontWeight: 800, letterSpacing: "0.28em", textTransform: "uppercase" }}>
                Quality & Trust
              </p>

              <h2
                id="trust-heading"
                style={{
                  margin: "20px 0 0",
                  maxWidth: "980px",
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: isMobile ? "39px" : "60px",
                  fontWeight: 400,
                  lineHeight: 1.08,
                  color: "white",
                  textAlign: "center",
                }}
              >
                Verified by qualified teachers.
              </h2>

              <p
                style={{
                  margin: "24px 0 0",
                  maxWidth: "930px",
                  color: "rgba(255,255,255,0.72)",
                  fontSize: isMobile ? "17px" : "20px",
                  fontWeight: 300,
                  lineHeight: 1.72,
                  textAlign: "center",
                }}
              >
                Dreamscape One combines the speed and flexibility of AI with the experience and judgement of educators. Educational content is reviewed for accuracy, clarity, age appropriateness and curriculum relevance before publication.
              </p>

              <div
                style={{
                  marginTop: isMobile ? "38px" : "48px",
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
                  gap: isMobile ? "20px" : "24px",
                }}
              >
                {trustPoints.map((point) => (
                  <TrustCard key={point.title} {...point} />
                ))}
              </div>

              <div
                style={{
                  marginTop: isMobile ? "36px" : "46px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  maxWidth: "760px",
                  padding: isMobile ? "15px 18px" : "16px 26px",
                  borderRadius: "999px",
                  border: "1px solid rgba(142,232,255,0.34)",
                  background: "linear-gradient(135deg, rgba(83,215,255,0.1), rgba(197,140,255,0.11))",
                  color: "rgba(255,255,255,0.94)",
                  fontSize: isMobile ? "14px" : "16px",
                  fontWeight: 800,
                  lineHeight: 1.4,
                  textAlign: "center",
                }}
              >
                <span aria-hidden="true" style={{ color: "#8ee8ff", fontSize: "18px", flexShrink: 0 }}>✓</span>
                AI supports the process. Teachers make the final call.
              </div>
            </div>
          </section>



          <section
            id="testimonials"
            aria-labelledby="testimonials-heading"
            style={{
              marginTop: isMobile ? "84px" : "112px",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#ffbd73",
                fontSize: "12px",
                fontWeight: 900,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              Families & Educators
            </p>

            <h2
              id="testimonials-heading"
              style={{
                margin: "18px 0 0",
                maxWidth: "980px",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "40px" : "60px",
                fontWeight: 400,
                lineHeight: 1.08,
                color: "white",
              }}
            >
              Built to make learning meaningful — and worth returning to.
            </h2>

            <p
              style={{
                margin: "22px 0 0",
                maxWidth: "820px",
                color: "rgba(255,255,255,0.68)",
                fontSize: isMobile ? "16px" : "18px",
                fontWeight: 300,
                lineHeight: 1.7,
              }}
            >
              Hear how DREAMSCAPE is experienced from the perspectives that matter most: parents, educators and learners.
            </p>

            <div
              style={{
                marginTop: isMobile ? "36px" : "48px",
                width: "100%",
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: isMobile ? "18px" : "24px",
                alignItems: "stretch",
              }}
            >
              {[
                {
                  eyebrow: "Parent Perspective",
                  quote:
                    "What I like most is that my child doesn’t see DREAMSCAPE as another worksheet. He wants to complete the missions because there is something to work towards afterwards, and that has made him much more willing to practise independently.",
                  name: "Parent of Primary School Learner",
                  meta: "Motivation & independent practice",
                  accent: "#8ee8ff",
                },
                {
                  eyebrow: "Educator Perspective",
                  quote:
                    "Good educational content should do more than test whether a child can recall an answer. It should develop understanding, reasoning and the confidence to tackle unfamiliar questions. That is what we aim for in DREAMSCAPE — carefully structured, age-appropriate content that gives children meaningful practice while still challenging them to think.",
                  name: "Katherine Law",
                  meta: "M.Ed (Gifted Ed), PGDE, B.A. · Curriculum Development, Dreamscape One",
                  accent: "#c58cff",
                },
                {
                  eyebrow: "Learner Perspective",
                  quote:
                    "I like that the quizzes actually help me earn things for Nova’s world. I can use my rewards to upgrade the rover and customise Nova’s home, so finishing a learning mission feels like I’m progressing in the game too.",
                  name: "Primary School Learner",
                  meta: "Learning + rewards",
                  accent: "#ffbd73",
                },
              ].map((testimonial) => (
                <article
                  key={testimonial.eyebrow}
                  style={{
                    minHeight: isMobile ? "auto" : "410px",
                    padding: isMobile ? "28px 24px" : "34px 30px",
                    display: "flex",
                    flexDirection: "column",
                    textAlign: "left",
                    borderRadius: "28px",
                    border: `1px solid ${testimonial.accent}33`,
                    background:
                      "linear-gradient(145deg, rgba(255,255,255,0.062), rgba(255,255,255,0.018))",
                    boxShadow: "0 26px 66px rgba(0,0,0,0.28)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "16px",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: testimonial.accent,
                        fontSize: "11px",
                        fontWeight: 900,
                        letterSpacing: "0.17em",
                        textTransform: "uppercase",
                      }}
                    >
                      {testimonial.eyebrow}
                    </p>
                    <span
                      aria-hidden="true"
                      style={{
                        color: testimonial.accent,
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        fontSize: "44px",
                        lineHeight: 0.8,
                        opacity: 0.8,
                      }}
                    >
                      “
                    </span>
                  </div>

                  <blockquote
                    style={{
                      margin: "24px 0 0",
                      flex: 1,
                      color: "rgba(255,255,255,0.86)",
                      fontSize: isMobile ? "17px" : "18px",
                      fontWeight: 300,
                      lineHeight: 1.7,
                      fontStyle: "italic",
                    }}
                  >
                    {testimonial.quote}
                  </blockquote>

                  <div
                    style={{
                      marginTop: "28px",
                      paddingTop: "22px",
                      borderTop: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: "white",
                        fontSize: "16px",
                        fontWeight: 800,
                        lineHeight: 1.35,
                      }}
                    >
                      {testimonial.name}
                    </p>
                    <p
                      style={{
                        margin: "7px 0 0",
                        color: "rgba(255,255,255,0.5)",
                        fontSize: "13px",
                        fontWeight: 600,
                        lineHeight: 1.5,
                      }}
                    >
                      {testimonial.meta}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>


          <section
            id="build-with-dreamscape"
            aria-labelledby="build-with-dreamscape-heading"
            style={{
              position: "relative",
              marginTop: isMobile ? "84px" : "112px",
              width: "100%",
              overflow: "hidden",
              borderRadius: isMobile ? "28px" : "36px",
              border: "1px solid rgba(142,232,255,0.22)",
              background:
                "radial-gradient(circle at 10% 20%, rgba(83,215,255,0.16), transparent 30%), radial-gradient(circle at 92% 80%, rgba(197,140,255,0.16), transparent 32%), linear-gradient(145deg, rgba(6,20,39,0.96), rgba(11,8,30,0.97))",
              boxShadow: "0 30px 80px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                position: "relative",
                zIndex: 2,
                minHeight: isMobile ? "auto" : "360px",
                padding: isMobile ? "42px 26px" : "52px 58px",
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 260px",
                gap: isMobile ? "30px" : "44px",
                alignItems: "center",
              }}
            >
              <div style={{ textAlign: "left" }}>
                <p style={{ margin: 0, color: "#8ee8ff", fontSize: "11px", fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                  Dreamscape Builders
                </p>
                <h2
                  id="build-with-dreamscape-heading"
                  style={{
                    margin: "16px 0 0",
                    maxWidth: "780px",
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: isMobile ? "38px" : "54px",
                    fontWeight: 400,
                    lineHeight: 1.07,
                    color: "white",
                  }}
                >
                  Want to build something real?
                </h2>
                <p style={{ margin: "20px 0 0", maxWidth: "760px", color: "rgba(255,255,255,0.7)", fontSize: isMobile ? "16px" : "18px", fontWeight: 300, lineHeight: 1.68 }}>
                  We open selected side projects for students, recent graduates and early-career builders who want hands-on experience across education, content, design, AI and product development.
                </p>
                <div style={{ marginTop: "24px", display: "flex", flexWrap: "wrap", gap: "9px" }}>
                  {["Project-based", "Flexible", "Real work"].map((label) => (
                    <span key={label} style={{ padding: "8px 11px", borderRadius: "999px", border: "1px solid rgba(142,232,255,0.16)", background: "rgba(83,215,255,0.055)", color: "rgba(255,255,255,0.7)", fontSize: "11px", fontWeight: 800 }}>
                      {label}
                    </span>
                  ))}
                </div>
                <Link
                  href="/join-us"
                  style={{
                    marginTop: "28px",
                    minHeight: "50px",
                    padding: "12px 20px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "999px",
                    background: "linear-gradient(90deg, #8ee8ff, #c58cff)",
                    color: "#140725",
                    textDecoration: "none",
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing: "0.09em",
                    textTransform: "uppercase",
                  }}
                >
                  Explore Open Projects →
                </Link>
              </div>
              <div aria-hidden="true" style={{ height: isMobile ? "180px" : "250px", display: "flex", alignItems: "flex-end", justifyContent: "center", overflow: "hidden" }}>
                <img src="/nova/nova-character.png" alt="" style={{ height: isMobile ? "178px" : "242px", width: "auto", objectFit: "contain", display: "block", filter: "drop-shadow(0 22px 46px rgba(0,0,0,0.42))" }} />
              </div>
            </div>
          </section>


          <section
            id="pricing-preview"
            aria-labelledby="pricing-preview-heading"
            style={{
              marginTop: isMobile ? "86px" : "116px",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              scrollMarginTop: isMobile ? "92px" : "108px",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#8ee8ff",
                fontSize: "12px",
                fontWeight: 900,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              Dreamscape Memberships
            </p>

            <h2
              id="pricing-preview-heading"
              style={{
                margin: "18px 0 0",
                maxWidth: "980px",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "41px" : "62px",
                fontWeight: 400,
                lineHeight: 1.07,
                color: "white",
              }}
            >
              Choose the right starting point.
            </h2>

            <p
              style={{
                margin: "22px 0 0",
                maxWidth: "860px",
                color: "rgba(255,255,255,0.7)",
                fontSize: isMobile ? "16px" : "19px",
                fontWeight: 300,
                lineHeight: 1.7,
              }}
            >
              Eligible first-time Dreamscape learners can begin with one 7-day introductory trial on current academic plans. Core focuses on English and Mathematics, while NOVA+ adds the parent learning-intelligence layer. Full Access and Milo Finance are both coming soon.
            </p>

            <div
              style={{
                marginTop: isMobile ? "30px" : "36px",
                width: "100%",
                maxWidth: "980px",
                padding: isMobile ? "18px" : "20px 26px",
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                alignItems: "center",
                justifyContent: "center",
                gap: isMobile ? "8px" : "14px",
                borderRadius: "24px",
                border: "1px solid rgba(142,232,255,0.28)",
                background:
                  "linear-gradient(100deg, rgba(83,215,255,0.11), rgba(197,140,255,0.09) 56%, rgba(255,174,92,0.1))",
                boxShadow: "0 24px 68px rgba(0,0,0,0.24)",
              }}
            >
              <span
                style={{
                  color: "#8ee8ff",
                  fontSize: isMobile ? "25px" : "30px",
                  fontWeight: 900,
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                7-DAY INTRODUCTORY TRIAL
              </span>
              <span
                aria-hidden="true"
                style={{
                  display: isMobile ? "none" : "block",
                  width: "1px",
                  height: "30px",
                  background: "rgba(255,255,255,0.18)",
                }}
              />
              <span
                style={{
                  color: "rgba(255,255,255,0.76)",
                  fontSize: isMobile ? "13px" : "15px",
                  fontWeight: 700,
                  lineHeight: 1.5,
                }}
              >
                Once for an eligible first-time Dreamscape learner
              </span>
            </div>

            <div
              style={{
                marginTop: isMobile ? "28px" : "38px",
                width: "100%",
                maxWidth: "1120px",
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: isMobile ? "18px" : "24px",
                alignItems: "stretch",
              }}
            >
              <article
                style={{
                  minHeight: isMobile ? "auto" : "430px",
                  padding: isMobile ? "29px 24px" : "36px 34px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  textAlign: "left",
                  borderRadius: "28px",
                  border: "1px solid rgba(197,140,255,0.3)",
                  background:
                    "radial-gradient(circle at 12% 0%, rgba(197,140,255,0.12), transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.065), rgba(255,255,255,0.018))",
                  boxShadow: "0 26px 68px rgba(0,0,0,0.28)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#c58cff",
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  English + Mathematics
                </p>
                <h3 style={{ margin: "14px 0 0", color: "white", fontSize: isMobile ? "30px" : "34px", fontWeight: 800 }}>
                  Core Missions
                </h3>
                <div style={{ marginTop: "21px", display: "flex", alignItems: "flex-end", gap: "8px" }}>
                  <span style={{ color: "rgba(255,255,255,0.54)", fontSize: "15px", paddingBottom: "6px" }}>SGD</span>
                  <span style={{ color: "white", fontSize: isMobile ? "43px" : "49px", fontWeight: 900, lineHeight: 1 }}>19.90</span>
                  <span style={{ color: "rgba(255,255,255,0.52)", fontSize: "14px", paddingBottom: "6px" }}>/month</span>
                </div>
                <p style={{ margin: "7px 0 0", color: "rgba(255,255,255,0.42)", fontSize: "12px", lineHeight: 1.5 }}>
                  Launch price · Regular SGD 24.90/month
                </p>
                <p style={{ margin: "9px 0 0", color: "#8ee8ff", fontSize: "13px", fontWeight: 800 }}>
                  Eligible first-time learners can start with the 7-day trial
                </p>

                <div
                  style={{
                    marginTop: "25px",
                    paddingTop: "23px",
                    width: "100%",
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "13px",
                    flex: 1,
                  }}
                >
                  {["Primary 1–6 English", "Primary 1–6 Mathematics", "Think Lab & Knowledge Arena", "Progress, DT & DG rewards"].map((feature) => (
                    <div key={feature} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                      <span aria-hidden="true" style={{ color: "#c58cff", fontWeight: 900 }}>✓</span>
                      <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "15px", lineHeight: 1.5 }}>{feature}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article
                style={{
                  position: "relative",
                  minHeight: isMobile ? "auto" : "430px",
                  padding: isMobile ? "29px 24px" : "36px 34px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  textAlign: "left",
                  borderRadius: "28px",
                  border: "1px solid rgba(142,232,255,0.52)",
                  background:
                    "radial-gradient(circle at 88% 0%, rgba(83,215,255,0.13), transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.078), rgba(255,255,255,0.02))",
                  boxShadow: "0 28px 78px rgba(0,0,0,0.31), 0 0 30px rgba(83,215,255,0.06)",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "18px",
                    right: "18px",
                    padding: "7px 11px",
                    borderRadius: "999px",
                    border: "1px solid rgba(142,232,255,0.28)",
                    background: "rgba(83,215,255,0.11)",
                    color: "#8ee8ff",
                    fontSize: "9px",
                    fontWeight: 900,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Parent Intelligence
                </span>
                <p
                  style={{
                    margin: 0,
                    paddingRight: "124px",
                    color: "#8ee8ff",
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  English + Mathematics + NOVA+
                </p>
                <h3 style={{ margin: "14px 0 0", color: "white", fontSize: isMobile ? "30px" : "34px", fontWeight: 800 }}>
                  NOVA+
                </h3>
                <div style={{ marginTop: "21px", display: "flex", alignItems: "flex-end", gap: "8px" }}>
                  <span style={{ color: "rgba(255,255,255,0.54)", fontSize: "15px", paddingBottom: "6px" }}>SGD</span>
                  <span style={{ color: "white", fontSize: isMobile ? "43px" : "49px", fontWeight: 900, lineHeight: 1 }}>24.90</span>
                  <span style={{ color: "rgba(255,255,255,0.52)", fontSize: "14px", paddingBottom: "6px" }}>/month</span>
                </div>
                <p style={{ margin: "7px 0 0", color: "rgba(255,255,255,0.42)", fontSize: "12px", lineHeight: 1.5 }}>
                  Launch price · Regular SGD 29.90/month
                </p>
                <p style={{ margin: "9px 0 0", color: "#8ee8ff", fontSize: "13px", fontWeight: 800 }}>
                  Eligible first-time learners can start with the 7-day trial
                </p>

                <div
                  style={{
                    marginTop: "25px",
                    paddingTop: "23px",
                    width: "100%",
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "13px",
                    flex: 1,
                  }}
                >
                  {["Everything in Core Missions", "My Learning + Strengths & Gaps", "Mastery Map + Nova Recommends", "Downloadable learning reports"].map((feature) => (
                    <div key={feature} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                      <span aria-hidden="true" style={{ color: "#8ee8ff", fontWeight: 900 }}>✓</span>
                      <span style={{ color: "rgba(255,255,255,0.78)", fontSize: "15px", lineHeight: 1.5 }}>{feature}</span>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <div
              style={{
                marginTop: "22px",
                width: "100%",
                maxWidth: "1120px",
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: "16px",
                textAlign: "left",
              }}
            >
              <article
                style={{
                  padding: isMobile ? "20px" : "22px 24px",
                  borderRadius: "22px",
                  border: "1px solid rgba(255,174,92,0.22)",
                  background: "rgba(255,174,92,0.055)",
                }}
              >
                <p style={{ margin: 0, color: "#ffbd73", fontSize: "10px", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                  Coming Soon · Academic Expansion
                </p>
                <p style={{ margin: "7px 0 0", color: "white", fontSize: "17px", fontWeight: 800, lineHeight: 1.4 }}>
                  Full Access
                </p>
                <p style={{ margin: "7px 0 0", color: "rgba(255,255,255,0.6)", fontSize: "13px", lineHeight: 1.55 }}>
                  English + Mathematics + Science + NOVA+
                </p>
                <p style={{ margin: "12px 0 0", color: "rgba(255,255,255,0.46)", fontSize: "12px", lineHeight: 1.5 }}>
                  Public pricing will be announced closer to launch.
                </p>
              </article>

              <article
                style={{
                  padding: isMobile ? "20px" : "22px 24px",
                  borderRadius: "22px",
                  border: "1px solid rgba(123,243,183,0.26)",
                  background: "linear-gradient(135deg, rgba(32,185,122,0.08), rgba(255,211,110,0.055))",
                }}
              >
                <p style={{ margin: 0, color: "#7bf3b7", fontSize: "10px", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                  Coming Soon · Real-World Learning
                </p>
                <div style={{ marginTop: "7px", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "14px", flexWrap: "wrap" }}>
                  <p style={{ margin: 0, color: "white", fontSize: "17px", fontWeight: 800, lineHeight: 1.4 }}>
                    Milo Finance
                  </p>
                  <span style={{ color: "#ffd36e", fontSize: "15px", fontWeight: 900, whiteSpace: "nowrap" }}>
                    SGD 12.90/month
                  </span>
                </div>
                <p style={{ margin: "7px 0 0", color: "rgba(255,255,255,0.6)", fontSize: "13px", lineHeight: 1.55 }}>
                  Financial literacy · Business Builder · Exchange lessons · Property benefits
                </p>

              </article>
            </div>

            <p
              style={{
                margin: "20px 0 0",
                color: "rgba(255,255,255,0.48)",
                fontSize: "12px",
                fontWeight: 600,
                lineHeight: 1.6,
              }}
            >
              Monthly launch prices shown. Annual plans and complete current details are available on the pricing page.
            </p>

            <Link
              href="/pricing"
              style={{
                marginTop: "28px",
                minHeight: "56px",
                padding: "14px 26px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "999px",
                background: "linear-gradient(90deg, #8ee8ff, #c58cff 58%, #ffae5c)",
                color: "#160729",
                textDecoration: "none",
                fontSize: "12px",
                fontWeight: 900,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                boxShadow: "0 18px 44px rgba(83,215,255,0.12)",
              }}
            >
              View Plans & Start Trial →
            </Link>

            <p
              style={{
                margin: "14px 0 0",
                maxWidth: "720px",
                color: "rgba(255,255,255,0.42)",
                fontSize: "11px",
                lineHeight: 1.6,
              }}
            >
              Trial eligibility is checked before checkout. Subscription terms and billing details are shown before payment.
            </p>
          </section>

          <button
            type="button"
            onClick={() => scrollToSection("home")}
            style={{
              marginTop: "54px",
              padding: "14px 28px",
              borderRadius: "999px",
              border: "1px solid rgba(83,215,255,0.45)",
              background: "linear-gradient(135deg, rgba(83,215,255,0.16), rgba(197,140,255,0.12))",
              color: "white",
              fontSize: "14px",
              fontWeight: 400,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Back to top
          </button>
        </div>
      </section>

      <footer
        style={{
          position: "relative",
          zIndex: 2,
          padding: "54px 7.6vw 42px",
          background: "linear-gradient(180deg, rgba(2,8,19,0.96), rgba(1,4,10,1))",
          borderTop: "1px solid rgba(116,200,255,0.18)",
          color: "white",
        }}
      >
        <div
          style={{
            maxWidth: "1540px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.35fr 0.72fr 1fr 0.82fr",
            gap: isMobile ? "34px" : "36px",
            alignItems: "start",
          }}
        >
          <div>
            <Link
              href="/"
              style={{ display: "flex", alignItems: "center", gap: "16px", color: "white", textDecoration: "none" }}
            >
              <img
                src="/home/dreamscape-logo.png"
                alt="Dreamscape One logo"
                style={{
                  width: "48px",
                  height: "48px",
                  objectFit: "contain",
                  borderRadius: "999px",
                  boxShadow: "0 0 16px rgba(197,140,255,0.26), 0 0 20px rgba(255,138,43,0.14)",
                }}
              />

              <div style={{ textAlign: "left" }}>
                <p style={{ margin: 0, fontSize: "17px", letterSpacing: "0.32em", textTransform: "uppercase", color: "white" }}>
                  Dreamscape One
                </p>
                <p style={{ margin: "8px 0 0", fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.56)" }}>
                  Learn · Think · Earn · Build
                </p>
              </div>
            </Link>

            <p style={{ margin: "24px 0 0", maxWidth: "440px", fontSize: "15px", lineHeight: 1.7, color: "rgba(255,255,255,0.62)", fontWeight: 300 }}>
              A connected learning ecosystem that grows from curriculum mastery and thinking skills into financial literacy, entrepreneurship and real-world decision-making.
            </p>
          </div>

          <div>
            <p style={{ margin: 0, color: "#8ee8ff", fontSize: "13px", letterSpacing: "0.22em", textTransform: "uppercase" }}>Explore</p>
            <div style={{ marginTop: "18px", display: "flex", flexDirection: "column", gap: "13px" }}>
              <Link href="/" style={footerLinkStyle}>Dreamscape Home</Link>
              <Link href="/inventor" style={footerLinkStyle}>Nova’s World</Link>
              <Link href="/milo-world" style={footerLinkStyle}>Milo’s World</Link>
              <Link href="/pricing" style={footerLinkStyle}>Pricing</Link>
            </div>
          </div>

          <div>
            <p style={{ margin: 0, color: "#c58cff", fontSize: "13px", letterSpacing: "0.22em", textTransform: "uppercase" }}>Dreamscape Guides</p>
            <div style={{ marginTop: "18px", display: "flex", flexDirection: "column", gap: "13px" }}>
              <Link href="/explore" style={footerLinkStyle}>Explore Dreamscape</Link>
              <Link href="/how-it-works" style={footerLinkStyle}>How Dreamscape Works</Link>
              <Link href="/explore/parents-guide" style={footerLinkStyle}>Parent’s Guide</Link>
              <Link href="/explore/nova-plus" style={footerLinkStyle}>NOVA+ for Parents</Link>
              <Link href="/explore/learning-missions" style={footerLinkStyle}>Learning Missions</Link>
            </div>
          </div>

          <div>
            <p style={{ margin: 0, color: "#ffbd73", fontSize: "13px", letterSpacing: "0.22em", textTransform: "uppercase" }}>Company & Legal</p>
            <div style={{ marginTop: "18px", display: "flex", flexDirection: "column", gap: "13px" }}>
              <Link href="/education-licence" style={footerLinkStyle}>For Tuition Centres</Link>
              <Link href="/affiliate" style={footerLinkStyle}>Partner With Us</Link>
              <Link href="/affiliate" style={footerLinkStyle}>Affiliate Programme</Link>
              <Link href="/join-us" style={footerLinkStyle}>Join Us</Link>
              <Link href="/terms" style={footerLinkStyle}>Terms & Conditions</Link>
            </div>
          </div>
        </div>

        <div
          style={{
            maxWidth: "1540px",
            margin: "42px auto 0",
            paddingTop: "24px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "flex-start" : "center",
            justifyContent: "space-between",
            gap: "24px",
            color: "rgba(255,255,255,0.46)",
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          <span>© {new Date().getFullYear()} Dreamscape One.</span>
          <span>Learning Missions · Thinking Skills · Financial Literacy · Entrepreneurship</span>
        </div>
      </footer>
    </main>
  );
}

function Founding50Announcement({
  isMobile,
  onRegister,
  onDismiss,
}: {
  isMobile: boolean;
  onRegister: () => void;
  onDismiss: () => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Close Founding 50 announcement"
        onClick={onDismiss}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 65,
          border: "none",
          padding: 0,
          background: "rgba(1,5,14,0.34)",
          backdropFilter: "blur(3px)",
          cursor: "pointer",
        }}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="founding-50-announcement-heading"
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 66,
          width: isMobile ? "calc(100vw - 32px)" : "min(680px, calc(100vw - 44px))",
          maxHeight: "calc(100dvh - 36px)",
          overflowY: "auto",
          borderRadius: isMobile ? "25px" : "32px",
          border: "1px solid rgba(142,232,255,0.32)",
          background:
            "radial-gradient(circle at 12% 0%, rgba(83,215,255,0.13), transparent 38%), radial-gradient(circle at 100% 40%, rgba(197,140,255,0.14), transparent 46%), rgba(5,13,29,0.84)",
          backdropFilter: "blur(22px)",
          WebkitBackdropFilter: "blur(22px)",
          boxShadow: "0 28px 90px rgba(0,0,0,0.55), 0 0 45px rgba(83,215,255,0.07)",
          color: "white",
          padding: isMobile ? "28px 24px 30px" : "38px 42px 40px",
          boxSizing: "border-box",
        }}
      >
        <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px"}}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "7px",
            padding: "9px 14px", borderRadius: "999px",
            border: "1px solid rgba(142,232,255,0.3)", background: "rgba(83,215,255,0.10)",
            color: "#8ee8ff", fontSize: "11px", fontWeight: 900,
            letterSpacing: "0.14em", textTransform: "uppercase",
          }}>
            ✦ Founding 50 · Beta Invitation
          </span>
          <button
            type="button"
            aria-label="Close announcement"
            onClick={onDismiss}
            style={{
              width: "40px", height: "40px", flexShrink: 0,
              borderRadius: "999px", border: "1px solid rgba(255,255,255,0.22)",
              background: "rgba(255,255,255,0.07)", color: "white", fontSize: "25px",
              lineHeight: 1, cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
        <h2
          id="founding-50-announcement-heading"
          style={{
            margin: isMobile ? "24px 0 0" : "28px 0 0",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: isMobile ? "37px" : "clamp(42px, 4vw, 52px)",
            lineHeight: 1.08, fontWeight: 400, letterSpacing: "-0.02em", color: "white",
          }}
        >
          We're looking for 50 families to help shape Dreamscape.
        </h2>
        <p style={{
          margin: "20px 0 0", color: "rgba(255,255,255,0.82)",
          fontSize: isMobile ? "16px" : "18px", lineHeight: 1.72, fontWeight: 300,
        }}>
          Children aged 6–12 can enjoy <strong style={{fontWeight: 700, color: "white"}}>30 days of complimentary NOVA+ access</strong>,
          share their feedback and receive exclusive Founding 50 benefits after launch.
        </p>
        <button
          type="button"
          onClick={onRegister}
          autoFocus
          style={{
            marginTop: "30px", minHeight: "54px", width: "100%", padding: "14px 24px",
            borderRadius: "999px", border: "none",
            background: "linear-gradient(90deg, #8ee8ff, #c58cff)", color: "#100622",
            fontSize: "12px", fontWeight: 900, letterSpacing: "0.1em",
            textTransform: "uppercase", cursor: "pointer",
            boxShadow: "0 14px 36px rgba(83,215,255,0.14)",
          }}
        >
          Register Your Interest →
        </button>
        <p style={{
          margin: "15px 0 0", color: "rgba(255,255,255,0.56)",
          textAlign: "center", fontSize: "12px", lineHeight: 1.6,
        }}>
          Free to apply · 50 selected families · No payment required
        </p>
      </section>
    </>
  );
}

function Founding50InterestModal({
  isMobile,
  submissionState,
  errorMessage,
  formData,
  onClose,
  onChange,
  onSubmit,
}: {
  isMobile: boolean;
  submissionState: Founding50SubmissionState;
  errorMessage: string;
  formData: Founding50FormData;
  onClose: () => void;
  onChange: (field: keyof Founding50FormData, value: string | boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Close Founding 50 registration form"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 88,
          border: "none",
          padding: 0,
          background: "rgba(0,0,0,0.68)",
          backdropFilter: "blur(10px)",
          cursor: "pointer",
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="founding-50-modal-heading"
        style={{
          position: "fixed",
          inset: isMobile ? "18px" : "50% auto auto 50%",
          transform: isMobile ? "none" : "translate(-50%, -50%)",
          zIndex: 90,
          width: isMobile ? "auto" : "min(940px, calc(100vw - 40px))",
          maxHeight: isMobile ? "calc(100vh - 36px)" : "min(88vh, 860px)",
          overflowY: "auto",
          borderRadius: isMobile ? "28px" : "32px",
          border: "1px solid rgba(142,232,255,0.22)",
          background:
            "radial-gradient(circle at 18% 15%, rgba(83,215,255,0.14), transparent 30%), radial-gradient(circle at 82% 18%, rgba(197,140,255,0.14), transparent 30%), linear-gradient(145deg, rgba(4,14,29,0.98), rgba(10,7,28,0.99))",
          boxShadow: "0 30px 90px rgba(0,0,0,0.52)",
          color: "white",
        }}
        className="founding50-modal"
      >
        <style>{`.founding50-modal input::selection { background: #8ee8ff; color: #061022; }
          .founding50-modal input { color-scheme: dark; }
          .founding50-modal input::placeholder { color: rgba(255,255,255,0.46); }`}</style>
        <div
          style={{
            padding: isMobile ? "24px 20px 22px" : "30px 30px 28px",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 0.94fr) minmax(0, 1.06fr)",
            gap: isMobile ? "24px" : "30px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "8px 12px",
                  borderRadius: "999px",
                  border: "1px solid rgba(142,232,255,0.24)",
                  background: "rgba(83,215,255,0.08)",
                  color: "#8ee8ff",
                  fontSize: "10px",
                  fontWeight: 900,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                }}
              >
                ✦ Founding 50
              </span>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close Founding 50 registration form"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(255,255,255,0.05)",
                  color: "white",
                  fontSize: "24px",
                  lineHeight: 1,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <h3
              id="founding-50-modal-heading"
              style={{
                margin: "18px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "34px" : "44px",
                fontWeight: 400,
                lineHeight: 1.06,
                color: "white",
              }}
            >
              Join Dreamscape’s Founding 50.
            </h3>

            <p
              style={{
                margin: "18px 0 0",
                color: "rgba(255,255,255,0.72)",
                fontSize: isMobile ? "15px" : "16px",
                lineHeight: 1.68,
                fontWeight: 300,
              }}
            >
              Register your interest for 30 days of complimentary NOVA+ access. Selected families will be invited manually and activation starts the child’s beta period.
            </p>

            <div
              style={{
                marginTop: "20px",
                padding: isMobile ? "18px" : "20px",
                borderRadius: "24px",
                border: "1px solid rgba(142,232,255,0.16)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <p style={{ margin: 0, color: "#8ee8ff", fontSize: "11px", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>What selected families receive</p>
              <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  "30 days of complimentary NOVA+ access",
                  "30% off NOVA+ for the first 6 paid months after launch",
                  "Permanent Founding 50 profile badge",
                  "500 Dream Tokens and 20 Dream Gems",
                  "A chance to shape Dreamscape through feedback",
                ].map((item) => (
                  <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <span aria-hidden="true" style={{ color: "#8ee8ff", fontWeight: 900 }}>✓</span>
                    <span style={{ color: "rgba(255,255,255,0.82)", fontSize: "14px", lineHeight: 1.55 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: isMobile ? "20px 18px" : "24px 24px 22px",
              borderRadius: "28px",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02))",
            }}
          >
            {submissionState === "success" ? (
              <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <p style={{ margin: 0, color: "#8ee8ff", fontSize: "11px", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>Interest registered</p>
                <h4 style={{ margin: "16px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "30px" : "34px", fontWeight: 400, lineHeight: 1.1 }}>Thanks for registering your interest.</h4>
                <p style={{ margin: "16px 0 0", color: "rgba(255,255,255,0.74)", fontSize: "15px", lineHeight: 1.68 }}>We’ve received your Founding 50 application. If selected, we’ll contact you using the email address provided with next steps to activate the student’s beta access.</p>
                <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {['Manual admin selection', 'No payment required', 'One short feedback survey during the final week'].map((item) => (
                    <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                      <span aria-hidden="true" style={{ color: "#8ee8ff", fontWeight: 900 }}>•</span>
                      <span style={{ color: "rgba(255,255,255,0.82)", fontSize: "14px", lineHeight: 1.55 }}>{item}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    marginTop: "auto",
                    minHeight: "50px",
                    padding: "12px 20px",
                    borderRadius: "999px",
                    border: "none",
                    background: "linear-gradient(90deg, #8ee8ff, #c58cff)",
                    color: "#100622",
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label htmlFor="founding50-student-name" style={{ display: "block", marginBottom: "8px", color: "rgba(255,255,255,0.86)", fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Student's name
                  </label>
                  <input
                    id="founding50-student-name"
                    autoFocus
                    value={formData.studentName}
                    onChange={(event) => onChange("studentName", event.target.value)}
                    required
                    placeholder="Enter the student’s name"
                    style={founding50InputStyle}
                  />
                </div>

                <fieldset style={{ border: "none", padding: 0, margin: 0, minWidth: 0 }}>
                  <legend style={{
                    marginBottom: "10px", color: "rgba(255,255,255,0.86)",
                    fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
                  }}>
                    Student's age
                  </legend>
                  <div
                    role="radiogroup"
                    aria-label="Student's age (6 to 12)"
                    aria-required="true"
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "repeat(4, minmax(0, 1fr))" : "repeat(7, minmax(0, 1fr))",
                      gap: "7px",
                    }}
                  >
                    {[6, 7, 8, 9, 10, 11, 12].map((age) => {
                      const isSelected = formData.studentAge === String(age);
                      return (
                        <button
                          key={age}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={isSelected || (!formData.studentAge && age === 6) ? 0 : -1}
                          onClick={() => onChange("studentAge", String(age))}
                          onKeyDown={(event) => {
                            const isForward = event.key === "ArrowRight" || event.key === "ArrowDown";
                            const isBackward = event.key === "ArrowLeft" || event.key === "ArrowUp";
                            if (!isForward && !isBackward && event.key !== "Home" && event.key !== "End") return;
                            event.preventDefault();
                            const nextAge = event.key === "Home" ? 6 : event.key === "End" ? 12
                              : ((age - 6 + (isForward ? 1 : 6)) % 7) + 6;
                            onChange("studentAge", String(nextAge));
                            const target = event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(
                              `[data-founding-age="${nextAge}"]`
                            );
                            target?.focus();
                          }}
                          data-founding-age={age}
                          style={{
                            minHeight: "48px", borderRadius: "14px",
                            border: isSelected ? "1px solid rgba(142,232,255,0.9)" : "1px solid rgba(255,255,255,0.18)",
                            background: isSelected
                              ? "linear-gradient(125deg, #8ee8ff, #c58cff)"
                              : "rgba(17,25,49,0.96)",
                            color: isSelected ? "#0b1630" : "rgba(255,255,255,0.9)",
                            fontSize: "16px", fontWeight: 800,
                            cursor: "pointer", boxShadow: isSelected ? "0 8px 22px rgba(83,215,255,0.14)" : "none",
                          }}
                        >
                          {age}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <div>
                  <label htmlFor="founding50-email" style={{ display: "block", marginBottom: "8px", color: "rgba(255,255,255,0.86)", fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Email address for account
                  </label>
                  <input
                    id="founding50-email"
                    type="email"
                    value={formData.email}
                    onChange={(event) => onChange("email", event.target.value)}
                    required
                    placeholder="parent@example.com"
                    style={founding50InputStyle}
                  />
                  <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.48)", fontSize: "12px", lineHeight: 1.5 }}>
                    This should be the parent or guardian email address we use to contact you and set up the account if selected.
                  </p>
                </div>

                <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginTop: "2px", color: "rgba(255,255,255,0.78)", fontSize: "13px", lineHeight: 1.6 }}>
                  <input
                    type="checkbox"
                    checked={formData.consent}
                    onChange={(event) => onChange("consent", event.target.checked)}
                    required
                    style={{ marginTop: "3px", accentColor: "#8ee8ff" }}
                  />
                  <span>
                    I confirm that I am the parent or legal guardian of the student named above. I consent to Dreamscape One collecting and using the information provided to process this beta application, contact me about participation, and create the student’s account if selected. I have read the <Link href="/founding-50/terms" target="_blank" style={{ color: "#8ee8ff", textDecoration: "none" }}>Beta Programme Terms</Link> and <Link href="/founding-50/privacy" target="_blank" style={{ color: "#8ee8ff", textDecoration: "none" }}>Privacy Notice</Link>.
                  </span>
                </label>

                {errorMessage ? (
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: "16px",
                      border: "1px solid rgba(255,138,92,0.24)",
                      background: "rgba(255,138,92,0.08)",
                      color: "#ffd2bf",
                      fontSize: "13px",
                      lineHeight: 1.5,
                    }}
                  >
                    {errorMessage}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={submissionState === "submitting"}
                  style={{
                    marginTop: "8px",
                    minHeight: "52px",
                    padding: "13px 18px",
                    borderRadius: "999px",
                    border: "none",
                    background: "linear-gradient(90deg, #8ee8ff, #c58cff)",
                    color: "#100622",
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: submissionState === "submitting" ? "default" : "pointer",
                    opacity: submissionState === "submitting" ? 0.7 : 1,
                  }}
                >
                  {submissionState === "submitting" ? "Submitting…" : "Submit Interest →"}
                </button>

                <p style={{ margin: 0, color: "rgba(255,255,255,0.44)", fontSize: "11px", lineHeight: 1.55 }}>
                  Limited places. Applying does not guarantee selection. No payment details are required during beta registration.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const founding50InputStyle: CSSProperties = {
  width: "100%",
  minHeight: "52px",
  padding: "0 16px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  fontSize: "15px",
  fontWeight: 500,
  outline: "none",
  boxSizing: "border-box",
};

function ProductPreviewCard({
  eyebrow,
  title,
  text,
  imageSrc,
  guideHref,
  guideLabel,
}: {
  eyebrow: string;
  title: string;
  text: string;
  imageSrc: string;
  guideHref: string;
  guideLabel: string;
}) {
  return (
    <article
      style={{
        minHeight: "520px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: "28px",
        border: "1px solid rgba(142,232,255,0.22)",
        background: "linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.022))",
        boxShadow: "0 26px 66px rgba(0,0,0,0.32)",
      }}
    >
      <div style={{ height: "270px", minHeight: "270px", overflow: "hidden", borderBottom: "1px solid rgba(142,232,255,0.12)", background: "#06101f" }}>
        <img
          src={imageSrc}
          alt={`${title} preview`}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>

      <div style={{ flex: 1, padding: "29px 28px 32px", display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left" }}>
        <p style={{ margin: 0, color: "#8ee8ff", fontSize: "12px", fontWeight: 900, letterSpacing: "0.19em", textTransform: "uppercase" }}>
          {eyebrow}
        </p>
        <h3 style={{ margin: "13px 0 0", color: "white", fontSize: "27px", fontWeight: 800, lineHeight: 1.2 }}>
          {title}
        </h3>
        <p style={{ margin: "18px 0 0", color: "rgba(255,255,255,0.68)", fontSize: "16px", fontWeight: 300, lineHeight: 1.68 }}>
          {text}
        </p>

        <Link
          href={guideHref}
          style={{
            marginTop: "auto",
            paddingTop: "24px",
            color: "#8ee8ff",
            textDecoration: "none",
            fontSize: "12px",
            fontWeight: 900,
            lineHeight: 1.4,
          }}
        >
          {guideLabel} →
        </Link>
      </div>
    </article>
  );
}

function TrustCard({
  title,
  text,
  imageSrc,
  placeholderLabel,
}: {
  title: string;
  text: string;
  imageSrc: string;
  placeholderLabel: string;
}) {
  return (
    <article
      style={{
        minHeight: "360px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "34px 28px 32px",
        borderRadius: "26px",
        border: "1px solid rgba(142,232,255,0.2)",
        background: "linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.025))",
      }}
    >
      <div
        style={{
          width: "132px",
          height: "132px",
          borderRadius: "30px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          border: imageSrc ? "1px solid rgba(142,232,255,0.32)" : "1px dashed rgba(142,232,255,0.42)",
          background: "radial-gradient(circle at 50% 38%, rgba(83,215,255,0.2), rgba(197,140,255,0.1) 55%, rgba(2,8,19,0.78))",
        }}
      >
        {imageSrc ? (
          <img src={imageSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <span style={{ padding: "14px", color: "rgba(255,255,255,0.62)", fontSize: "10px", fontWeight: 900, letterSpacing: "0.13em", lineHeight: 1.5, textTransform: "uppercase" }}>
            {placeholderLabel}
          </span>
        )}
      </div>

      <h3 style={{ margin: "24px 0 0", color: "white", fontSize: "27px", fontWeight: 800, lineHeight: 1.2 }}>
        {title}
      </h3>
      <p style={{ margin: "18px 0 0", color: "rgba(255,255,255,0.68)", fontSize: "16px", fontWeight: 300, lineHeight: 1.68 }}>
        {text}
      </p>
    </article>
  );
}

function NovaPlusScreenshot({
  label,
  filename,
  accent,
}: {
  label: string;
  filename: string;
  accent: string;
}) {
  return (
    <figure
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100%",
        margin: 0,
        borderRadius: "22px",
        border: `1px solid ${accent}44`,
        background:
          "linear-gradient(145deg, rgba(255,255,255,0.045), rgba(255,255,255,0.014))",
        overflow: "hidden",
        boxShadow:
          "0 22px 54px rgba(0,0,0,0.24), inset 0 0 20px rgba(255,255,255,0.02)",
      }}
    >
      <img
        src={filename}
        alt={`NOVA+ ${label} screenshot`}
        loading="lazy"
        style={{
          width: "100%",
          height: "100%",
          minHeight: "100%",
          objectFit: "contain",
          objectPosition: "center",
          display: "block",
          background: "#050b16",
        }}
      />
    </figure>
  );
}

function NovaPlusFeatureCard({
  eyebrow,
  title,
  text,
  filename,
  accent,
}: {
  eyebrow: string;
  title: string;
  text: string;
  filename: string;
  accent: string;
}) {
  return (
    <article
      style={{
        minHeight: "610px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: "30px",
        border: `1px solid ${accent}36`,
        background:
          "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.018))",
        boxShadow: "0 28px 70px rgba(0,0,0,0.27)",
      }}
    >
      <div style={{ padding: "32px 30px 28px", textAlign: "left" }}>
        <p
          style={{
            margin: 0,
            color: accent,
            fontSize: "11px",
            fontWeight: 900,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </p>
        <h3
          style={{
            margin: "14px 0 0",
            color: "white",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: "34px",
            fontWeight: 400,
            lineHeight: 1.1,
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: "16px 0 0",
            color: "rgba(255,255,255,0.66)",
            fontSize: "15px",
            fontWeight: 300,
            lineHeight: 1.66,
          }}
        >
          {text}
        </p>
      </div>

      <div style={{ flex: 1, minHeight: "330px", padding: "0 14px 14px" }}>
        <NovaPlusScreenshot label={eyebrow.toUpperCase()} filename={filename} accent={accent} />
      </div>
    </article>
  );
}

function GrowthJourney({ isMobile }: { isMobile: boolean }) {
  const novaSkills = ["English", "Mathematics", "Science · Coming Soon", "Thinking Skills"];
  const miloSkills = ["Financial Literacy", "Business", "Entrepreneurship", "Decision Making"];

  return (
    <div
      style={{
        position: "relative",
        marginTop: isMobile ? "42px" : "58px",
        width: "100%",
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) minmax(210px, 0.34fr) minmax(0, 1fr)",
        gap: isMobile ? "34px" : "34px",
        alignItems: "center",
      }}
    >
      <JourneyWorld
        world="nova"
        imageSrc="/nova/nova-character.png"
        audience="Ages 6–12"
        title="Nova’s World"
        skills={novaSkills}
        summary="Build strong academic foundations through curriculum missions, thinking challenges, rewards and play."
        isMobile={isMobile}
      />

      <div
        aria-label="Progression from Nova to Milo"
        style={{
          position: "relative",
          minHeight: isMobile ? "230px" : "360px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: isMobile ? "8px 0" : "0 6px",
        }}
      >
        {!isMobile && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "-52px",
              right: "-52px",
              top: "50%",
              height: "2px",
              transform: "translateY(-50%)",
              background: "linear-gradient(90deg, rgba(221,179,255,0.78), rgba(255,255,255,0.82), rgba(255,207,141,0.8))",
              boxShadow: "0 0 24px rgba(255,255,255,0.22)",
            }}
          />
        )}

        {isMobile && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: "50%",
              width: "2px",
              transform: "translateX(-50%)",
              background: "linear-gradient(180deg, rgba(221,179,255,0.75), rgba(255,255,255,0.82), rgba(255,207,141,0.8))",
              boxShadow: "0 0 20px rgba(255,255,255,0.2)",
            }}
          />
        )}

        <div
          style={{
            position: "relative",
            zIndex: 2,
            padding: "12px 17px",
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.36)",
            background: "rgba(39,14,51,0.48)",
            backdropFilter: "blur(12px)",
            color: "white",
            fontSize: "11px",
            fontWeight: 900,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          Grows With Them
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 2,
            marginTop: "22px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {["Learn", "Think", "Become Independent", "Build Real-World Skills"].map((stage, index) => (
            <div key={stage} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  padding: "8px 11px",
                  borderRadius: "10px",
                  background: "rgba(35,13,47,0.4)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  color: "rgba(255,255,255,0.92)",
                  fontSize: "10px",
                  fontWeight: 900,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  backdropFilter: "blur(10px)",
                }}
              >
                {stage}
              </span>
              {index < 3 && (
                <span aria-hidden="true" style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px" }}>
                  {isMobile ? "↓" : "·"}
                </span>
              )}
            </div>
          ))}
        </div>

        {!isMobile && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              right: "-58px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "rgba(255,235,207,0.9)",
              fontSize: "36px",
              textShadow: "0 0 20px rgba(255,184,111,0.34)",
            }}
          >
            →
          </span>
        )}
      </div>

      <JourneyWorld
        world="milo"
        imageSrc="/milo-world/milo-character.png"
        audience="Real-World Skills"
        title="Milo’s World"
        skills={miloSkills}
        summary="Apply what you have learned to money, business, entrepreneurship and real-world choices."
        isMobile={isMobile}
      />
    </div>
  );
}

function JourneyWorld({
  world,
  imageSrc,
  audience,
  title,
  skills,
  summary,
  isMobile = false,
}: {
  world: "nova" | "milo";
  imageSrc: string;
  audience: string;
  title: string;
  skills: string[];
  summary: string;
  isMobile?: boolean;
}) {
  const isNova = world === "nova";

  return (
    <article
      style={{
        position: "relative",
        width: "100%",
        minWidth: 0,
        minHeight: isMobile ? "auto" : "460px",
        padding: isMobile ? "32px 20px" : "38px 30px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        borderRadius: "30px",
        border: "1px solid rgba(255,255,255,0.22)",
        background: isNova ? "rgba(48,18,74,0.28)" : "rgba(105,47,35,0.24)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 24px 64px rgba(35,8,36,0.2)",
      }}
    >
      <div
        style={{
          width: isMobile ? "138px" : "158px",
          height: isMobile ? "138px" : "158px",
          borderRadius: "999px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: isNova ? "1px solid rgba(225,193,255,0.56)" : "1px solid rgba(255,214,158,0.54)",
          background: isNova
            ? "radial-gradient(circle, rgba(197,140,255,0.24), rgba(42,16,68,0.22) 70%)"
            : "radial-gradient(circle, rgba(255,174,92,0.23), rgba(103,44,30,0.2) 70%)",
          overflow: "hidden",
          boxShadow: isNova ? "0 0 34px rgba(197,140,255,0.15)" : "0 0 34px rgba(255,174,92,0.13)",
        }}
      >
        <img
          src={imageSrc}
          alt={title}
          style={{
            width: isMobile ? "128px" : "148px",
            height: isMobile ? "128px" : "148px",
            objectFit: "contain",
            display: "block",
            transform: !isNova ? "scale(1.08)" : "none",
          }}
        />
      </div>

      <p
        style={{
          margin: "21px 0 0",
          color: isNova ? "#e3c2ff" : "#ffddb5",
          fontSize: "12px",
          fontWeight: 900,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        {audience}
      </p>

      <h3
        style={{
          margin: "9px 0 0",
          color: "white",
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: isMobile ? "34px" : "40px",
          fontWeight: 400,
          lineHeight: 1.14,
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: "14px 0 0",
          maxWidth: "490px",
          color: "rgba(255,255,255,0.78)",
          fontSize: isMobile ? "14px" : "15px",
          fontWeight: 400,
          lineHeight: 1.6,
        }}
      >
        {summary}
      </p>

      <div
        style={{
          marginTop: "22px",
          width: "100%",
          maxWidth: "500px",
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "10px",
        }}
      >
        {skills.map((skill) => (
          <div
            key={skill}
            style={{
              minHeight: isMobile ? "44px" : "48px",
              padding: isMobile ? "10px 10px" : "11px 13px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.94)",
              fontSize: isMobile ? "13px" : "14px",
              fontWeight: 700,
              lineHeight: 1.3,
              textAlign: "center",
            }}
          >
            {skill}
          </div>
        ))}
      </div>
    </article>
  );
}
