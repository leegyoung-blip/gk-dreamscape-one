"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PublicPreviewBanner from "@/components/PublicPreviewBanner";

type Section = "home" | "about";
type AgeGroup = "5-8" | "9-12" | "13-17" | "18+";

const FIRST_VISIT_KEY = "dreamscape-first-visit-complete";

const ageDestinations: Record<AgeGroup, string> = {
  "5-8": "/inventor",
  "9-12": "/inventor",
  "13-17": "/milo-world",
  "18+": "/milo-world",
};

type World = {
  key: "nova" | "milo";
  title: string;
  subtitle: string;
  href: string;
  imageSrc: string;
  videoSrc: string;
  accent: string;
};

const worlds: World[] = [
  {
    key: "nova",
    title: "Nova’s World",
    subtitle: "Master English, Math, and Science through learning missions.",
    href: "/inventor",
    imageSrc: "/home/nova-world-cover.png",
    videoSrc: "/home/nova-world-preview.mp4",
    accent: "#53d7ff",
  },
  {
    key: "milo",
    title: "Milo’s World",
    subtitle: "Build businesses and practise real-world decision-making.",
    href: "/milo-world",
    imageSrc: "/home/milo-world-cover.png",
    videoSrc: "/home/milo-world-preview.mp4",
    accent: "#c58cff",
  },
];

const ecosystemSteps = [
  {
    title: "Guru Kids Pro",
    subtitle: "Learning and teacher support",
    text: "The academic foundation: curriculum expertise, small-group classes, thinking-skills training, and real teacher guidance.",
    image: "/home/ecosystem-gkp.png",
    href: "https://gurukidspro.com",
  },
  {
    title: "Dreamscape One",
    subtitle: "Independent digital progression",
    text: "The gamified platform: Learning Missions, progress tracking, rewards, financial literacy, and business simulations that grow with the learner.",
    image: "/home/ecosystem-dreamscape.png",
  },
];

const trustPoints = [
  {
    title: "AI-Assisted Development",
    text: "AI helps us develop, organise, and improve learning content more efficiently.",
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
    text: "Content is refined using teacher feedback, learner performance, and curriculum updates.",
    imageSrc: "/home/trust-continuous-improvement.png",
    placeholderLabel: "CONTINUOUS IMPROVEMENT",
  },
];

const productPreviews = [
  {
    eyebrow: "Curriculum Learning",
    title: "Learning Missions",
    text: "Students practise English, Mathematics, and Science through structured quizzes, topic missions, rewards, and progressive challenges.",
    imageSrc: "/home/preview-learning-missions.png",
    placeholderLabel: "LEARNING MISSIONS SCREENSHOT",
  },
  {
    eyebrow: "Meaningful Progress",
    title: "Progress and Teacher Support",
    text: "Learning activity, scores, topic progress, and rewards are organised so students, parents, and educators can understand what comes next.",
    imageSrc: "/home/preview-progress-dashboard.png",
    placeholderLabel: "PROGRESS DASHBOARD SCREENSHOT",
  },
  {
    eyebrow: "Real-World Practice",
    title: "Milo’s Business Builder",
    text: "Teens make business, investment, pricing, staffing, and growth decisions through safe simulations with no real financial risk.",
    imageSrc: "/home/preview-business-builder.png",
    placeholderLabel: "BUSINESS BUILDER SCREENSHOT",
  },
];

const journeySteps = [
  {
    number: "01",
    title: "Choose a world",
    text: "Nova supports learners aged 6–12. Milo introduces real-world skills from age 13.",
  },
  {
    number: "02",
    title: "Learn through action",
    text: "Complete missions, solve challenges, make decisions, and earn meaningful progress.",
  },
  {
    number: "03",
    title: "Track growth",
    text: "Review scores, rewards, achievements, and the next areas to strengthen.",
  },
];

const reviewCards = [
  {
    quote:
      "Dreamscape One turns learning into something students actively participate in. The missions are engaging, structured and useful for reinforcing key skills.",
    reviewer: "Education professional",
    source: "Development preview",
  },
  {
    quote:
      "My child is more willing to practise independently because the activities feel like challenges rather than extra homework. I also like that progress is organised clearly.",
    reviewer: "Parent",
    source: "Development preview",
  },
  {
    quote:
      "I like earning rewards and moving through the missions. It makes learning feel more fun, and Milo’s World lets me try decisions I would not normally get to make.",
    reviewer: "Secondary 2 student",
    source: "Development preview",
  },
];


function WorldPanel({ world, isMobile }: { world: World; isMobile: boolean }) {
  const panelStyle: CSSProperties = {
    position: "relative",
    height: isMobile ? "520px" : "calc(100vh - 86px)",
    minWidth: 0,
    overflow: "hidden",
    textDecoration: "none",
    color: "white",
    backgroundImage: `
      linear-gradient(
        180deg,
        rgba(2, 8, 18, 0.04) 0%,
        rgba(2, 8, 18, 0.1) 35%,
        rgba(2, 8, 18, 0.92) 100%
      ),
      url(${world.imageSrc})
    `,
    backgroundSize: "cover",
    backgroundPosition: "center",
    transition: "filter 650ms ease",
    borderRight:
      world.key === "nova" && !isMobile
        ? "1px solid rgba(255,255,255,0.18)"
        : "none",
  };

  const contentInset = isMobile ? "28px" : "clamp(48px, 6.5vw, 122px)";

  const contentStyle: CSSProperties = {
    position: "absolute",
    zIndex: 10,
    left: contentInset,
    right: isMobile ? "28px" : "40px",
    bottom: isMobile ? "54px" : "104px",
    width: "auto",
    maxWidth: "520px",
    textAlign: "left",
  };

  return (
    <Link href={world.href} style={panelStyle}>
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
          zIndex: 3,
          background: `
            radial-gradient(
              circle at 50% 46%,
              rgba(255,255,255,0.06),
              transparent 40%
            ),
            linear-gradient(
              180deg,
              rgba(2,8,18,0) 24%,
              rgba(2,8,18,0.76) 100%
            )
          `,
          pointerEvents: "none",
        }}
      />

      <div style={contentStyle}>
        <h1
          style={{
            margin: 0,
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: isMobile ? "42px" : "clamp(44px, 4vw, 56px)",
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: "0.01em",
            color: "white",
            textShadow: "0 14px 42px rgba(0,0,0,0.6)",
          }}
        >
          {world.title}
        </h1>

        <p
          style={{
            margin: "16px 0 0",
            fontSize: isMobile ? "18px" : "23px",
            fontWeight: 300,
            lineHeight: 1.4,
            letterSpacing: "0.015em",
            color: "rgba(255,255,255,0.93)",
            textShadow: "0 8px 28px rgba(0,0,0,0.6)",
          }}
        >
          {world.subtitle}
        </p>

        <div
          style={{
            marginTop: "26px",
            display: "inline-flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 18px",
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.5)",
            background: "rgba(2,8,18,0.32)",
            backdropFilter: "blur(12px)",
            color: "rgba(255,255,255,0.92)",
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Enter World
          <span style={{ fontSize: "14px" }}>→</span>
        </div>
      </div>
    </Link>
  );
}

function FirstVisitPopup({
  isMobile,
  onSelectAge,
}: {
  isMobile: boolean;
  onSelectAge: (age: AgeGroup) => void;
}) {
  const ageOptions: AgeGroup[] = ["5-8", "9-12", "13-17", "18+"];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-visit-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "18px" : "32px",
        background: "rgba(1,4,11,0.78)",
        backdropFilter: "blur(14px)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "720px",
          maxHeight: "calc(100vh - 36px)",
          overflowY: "auto",
          borderRadius: isMobile ? "24px" : "32px",
          padding: isMobile ? "34px 22px 28px" : "46px 46px 40px",
          border: "1px solid rgba(116,200,255,0.35)",
          background:
            "radial-gradient(circle at 12% 0%, rgba(83,215,255,0.18), transparent 36%), radial-gradient(circle at 100% 100%, rgba(197,140,255,0.18), transparent 38%), rgba(3,10,23,0.97)",
          boxShadow:
            "0 34px 100px rgba(0,0,0,0.58), inset 0 0 38px rgba(83,215,255,0.04)",
          color: "white",
          textAlign: "center",
        }}
      >
        <img
          src="/home/dreamscape-logo.png"
          alt="Dreamscape One logo"
          style={{
            width: isMobile ? "62px" : "74px",
            height: isMobile ? "62px" : "74px",
            objectFit: "contain",
            borderRadius: "999px",
            boxShadow:
              "0 0 22px rgba(83,215,255,0.25), 0 0 28px rgba(197,140,255,0.22)",
          }}
        />

        <p
          style={{
            margin: "22px 0 0",
            color: "#8ee8ff",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
          }}
        >
          Welcome to Dreamscape One
        </p>

        <h2
          id="first-visit-title"
          style={{
            margin: "14px 0 0",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: isMobile ? "36px" : "48px",
            fontWeight: 400,
            lineHeight: 1.08,
          }}
        >
          How old are you?
        </h2>

        <p
          style={{
            margin: "18px auto 0",
            maxWidth: "560px",
            color: "rgba(255,255,255,0.7)",
            fontSize: isMobile ? "16px" : "18px",
            lineHeight: 1.6,
            fontWeight: 300,
          }}
        >
          Choose your age group and we’ll take you directly to the right world.
        </p>

        <div
          style={{
            marginTop: "30px",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
            gap: "12px",
          }}
        >
          {ageOptions.map((age) => (
            <button
              key={age}
              type="button"
              onClick={() => onSelectAge(age)}
              style={{
                minHeight: "62px",
                borderRadius: "16px",
                border: "1px solid rgba(116,200,255,0.3)",
                background: "rgba(255,255,255,0.055)",
                color: "white",
                fontSize: "16px",
                fontWeight: 700,
                cursor: "pointer",
                transition:
                  "transform 200ms ease, border-color 200ms ease, background 200ms ease",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.transform = "translateY(-3px)";
                event.currentTarget.style.borderColor = "rgba(116,200,255,0.7)";
                event.currentTarget.style.background =
                  "linear-gradient(135deg, rgba(83,215,255,0.2), rgba(197,140,255,0.18))";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.transform = "translateY(0)";
                event.currentTarget.style.borderColor = "rgba(116,200,255,0.3)";
                event.currentTarget.style.background =
                  "rgba(255,255,255,0.055)";
              }}
            >
              {age}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<Section>("home");
  const [isMobile, setIsMobile] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAccount, setIsCheckingAccount] = useState(true);
  const [showFirstVisitPopup, setShowFirstVisitPopup] = useState(false);

  useEffect(() => {
    function checkScreenSize() {
      setIsMobile(window.innerWidth <= 900);
    }

    checkScreenSize();

    window.addEventListener("resize", checkScreenSize);

    return () => {
      window.removeEventListener("resize", checkScreenSize);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      const hasAccount = !!session?.user;
      setIsLoggedIn(hasAccount);
      setIsCheckingAccount(false);

      if (hasAccount) {
        setShowFirstVisitPopup(false);
        return;
      }

      const hasCompletedFirstVisit =
        window.localStorage.getItem(FIRST_VISIT_KEY) === "true";
      setShowFirstVisitPopup(!hasCompletedFirstVisit);
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const hasAccount = !!session?.user;
      setIsLoggedIn(hasAccount);
      setIsCheckingAccount(false);

      if (hasAccount) {
        setShowFirstVisitPopup(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function updateActiveSection() {
      const aboutSection = document.getElementById("about");

      if (!aboutSection) return;

      const aboutTop = aboutSection.getBoundingClientRect().top;
      const triggerPoint = window.innerHeight * 0.45;

      if (aboutTop <= triggerPoint) {
        setActiveSection("about");
      } else {
        setActiveSection("home");
      }
    }

    updateActiveSection();

    window.addEventListener("scroll", updateActiveSection);
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  useEffect(() => {
    if (!showFirstVisitPopup) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showFirstVisitPopup]);

  function handleAgeSelection(age: AgeGroup) {
    window.localStorage.setItem(FIRST_VISIT_KEY, "true");
    setShowFirstVisitPopup(false);
    router.push(ageDestinations[age]);
  }

  function scrollToSection(section: Section) {
    const targetId = section === "home" ? "home" : "about";
    const target = document.getElementById(targetId);

    if (!target) return;

    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function navButtonStyle(section: Section): CSSProperties {
    const isActive = activeSection === section;

    return {
      position: "relative",
      height: "86px",
      border: "none",
      background: "transparent",
      color: isActive ? "white" : "rgba(255,255,255,0.78)",
      cursor: "pointer",
      fontSize: "17px",
      fontWeight: 400,
      letterSpacing: "0.04em",
      padding: 0,
      transition: "color 250ms ease",
    };
  }

  function navLineStyle(section: Section): CSSProperties {
    const isActive = activeSection === section;

    return {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: "14px",
      height: "2px",
      background: "#53d7ff",
      boxShadow: "0 0 12px rgba(83,215,255,0.85)",
      opacity: isActive ? 1 : 0,
      transform: isActive ? "scaleX(1)" : "scaleX(0.2)",
      transition: "opacity 250ms ease, transform 250ms ease",
      transformOrigin: "center",
    };
  }

  const footerLinkStyle: CSSProperties = {
    color: "rgba(255,255,255,0.68)",
    textDecoration: "none",
    fontSize: "15px",
    fontWeight: 300,
    lineHeight: 1.4,
    transition: "color 220ms ease",
  };

  const footerButtonStyle: CSSProperties = {
    ...footerLinkStyle,
    padding: 0,
    border: "none",
    background: "transparent",
    textAlign: "left",
    cursor: "pointer",
    fontFamily: "Arial, Helvetica, sans-serif",
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
      {showFirstVisitPopup && !isCheckingAccount && !isLoggedIn && (
        <FirstVisitPopup isMobile={isMobile} onSelectAge={handleAgeSelection} />
      )}

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
          gap: isMobile ? "12px" : "24px",
          padding: isMobile ? "0 14px" : "0 43px",
          background: "rgba(2,8,19,0.92)",
          borderBottom: "1px solid rgba(255,255,255,0.14)",
          backdropFilter: "blur(18px)",
        }}
      >
        <button
          onClick={() => scrollToSection("home")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? "10px" : "19px",
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

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              lineHeight: 1,
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: isMobile ? "12px" : "18px",
                fontWeight: 400,
                letterSpacing: isMobile ? "2.8px" : "10px",
                whiteSpace: "nowrap",
              }}
            >
              DREAMSCAPE ONE
            </span>

            <span
              style={{
                marginTop: "7px",
                fontSize: isMobile ? "7px" : "10px",
                fontWeight: 400,
                letterSpacing: isMobile ? "1.4px" : "3.2px",
                color: "rgba(255,255,255,0.58)",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              Powered by Guru Kids Pro
            </span>
          </div>
        </button>

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: isMobile ? "8px" : "34px",
            flexShrink: 0,
          }}
        >
          {!isMobile && (
            <>
              <button
                type="button"
                onClick={() => scrollToSection("home")}
                style={navButtonStyle("home")}
              >
                Home
                <span style={navLineStyle("home")} />
              </button>

              <button
                type="button"
                onClick={() => scrollToSection("about")}
                style={navButtonStyle("about")}
              >
                About
                <span style={navLineStyle("about")} />
              </button>
            </>
          )}

          <div
            style={{
              marginLeft: isMobile ? 0 : "18px",
              display: "flex",
              alignItems: "center",
              gap: isMobile ? "8px" : "14px",
            }}
          >
            <button
              type="button"
              onClick={() => router.push(isLoggedIn ? "/profile" : "/login")}
              style={{
                background: "rgba(255,255,255,0.94)",
                color: "#24124d",
                border: "1px solid rgba(255,255,255,0.45)",
                borderRadius: "999px",
                padding: isMobile ? "9px 11px" : "11px 22px",
                minWidth: isMobile ? "76px" : "138px",
                fontSize: isMobile ? "9px" : "12px",
                fontWeight: 800,
                letterSpacing: isMobile ? "0.06em" : "0.1em",
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
        </nav>
      </header>

      <section
        id="home"
        style={{
          position: "relative",
          width: "100vw",
          height: isMobile ? "auto" : "100vh",
          paddingTop: isMobile ? "72px" : "86px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gridTemplateRows: "1fr",
          background: "#020813",
        }}
      >
        <PublicPreviewBanner />
        <WorldPanel world={worlds[0]} isMobile={isMobile} />
        <WorldPanel world={worlds[1]} isMobile={isMobile} />

        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "calc(86px + ((100vh - 86px) / 2) - 3px)",
            zIndex: 30,
            width: "82px",
            height: "82px",
            transform: "translate(-50%, -50%)",
            borderRadius: "999px",
            display: isMobile ? "none" : "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "37px",
            color: "white",
            background: `
              radial-gradient(
                circle,
                rgba(255,255,255,0.13),
                rgba(2,8,18,0.94)
              ),
              linear-gradient(
                135deg,
                rgba(83,215,255,0.3),
                rgba(197,140,255,0.32)
              )
            `,
            border: "1px solid rgba(255,255,255,0.22)",
            boxShadow:
              "0 0 31px rgba(83,215,255,0.24), 0 0 46px rgba(197,140,255,0.2)",
            pointerEvents: "none",
          }}
        >
          ✦
        </div>

        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "39px",
            zIndex: 30,
            transform: "translateX(-50%)",
            display: isMobile ? "none" : "flex",
            alignItems: "center",
            gap: "26px",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              width: "149px",
              height: "1px",
              opacity: 0.75,
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.48))",
            }}
          />

          <p
            style={{
              margin: 0,
              fontSize: "17px",
              fontWeight: 300,
              lineHeight: 1,
              letterSpacing: "0.56em",
              whiteSpace: "nowrap",
              color: "transparent",
              background: "linear-gradient(90deg, #53d7ff, #c58cff)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
            }}
          >
            CHOOSE YOUR WORLD.
          </p>

          <span
            style={{
              width: "149px",
              height: "1px",
              opacity: 0.75,
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.48), transparent)",
            }}
          />
        </div>
      </section>

      <section
        id="about"
        style={{
          position: "relative",
          minHeight: "100vh",
          padding: isMobile ? "90px 22px 80px" : "150px 7.6vw 120px",
          background:
            "radial-gradient(circle at 50% 10%, rgba(83,215,255,0.18), transparent 33%), radial-gradient(circle at 28% 58%, rgba(197,140,255,0.1), transparent 28%), #020813",
          color: "white",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.3), transparent 42%, rgba(0,0,0,0.38))",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            maxWidth: "1540px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#53d7ff",
              fontSize: "16px",
              letterSpacing: "0.42em",
              textTransform: "uppercase",
              textAlign: "center",
            }}
          >
            About Dreamscape One
          </p>

          <div
            style={{
              marginTop: "24px",
              width: "270px",
              height: "2px",
              background:
                "linear-gradient(90deg, transparent, rgba(83,215,255,0.95), transparent)",
              boxShadow: "0 0 18px rgba(83,215,255,0.75)",
            }}
          />

          <h2
            style={{
              margin: "36px 0 0",
              maxWidth: "1040px",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "42px" : "72px",
              fontWeight: 400,
              lineHeight: 1.08,
              letterSpacing: "0.005em",
              color: "white",
              textShadow: "0 20px 58px rgba(0,0,0,0.42)",
              textAlign: "center",
            }}
          >
            From curriculum mastery to real-world life skills.
          </h2>

          <p
            style={{
              margin: "28px 0 0",
              maxWidth: "930px",
              fontSize: isMobile ? "17px" : "22px",
              fontWeight: 300,
              lineHeight: 1.7,
              color: "rgba(255,255,255,0.74)",
              textAlign: "center",
            }}
          >
            Dreamscape One is a gamified learning ecosystem by Guru Kids Pro.
            Children begin in Nova’s World with curriculum-based Learning
            Missions, thinking challenges, and independent progress. As they
            grow, Milo’s World introduces financial literacy, entrepreneurship,
            and real-world decision-making through safe simulations.
          </p>

          <div
            style={{
              marginTop: "58px",
              width: "100%",
              maxWidth: "1320px",
            }}
          >
            <p
              style={{
                margin: "0 0 20px",
                color: "rgba(255,255,255,0.86)",
                fontSize: "18px",
                fontWeight: 400,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                textAlign: "center",
              }}
            >
              The Dreamscape One Ecosystem
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "minmax(0, 1fr) 52px minmax(0, 1fr)",
                alignItems: "center",
                justifyContent: "center",
                gap: isMobile ? "18px" : "0",
              }}
            >
              {ecosystemSteps.map((step, index) => (
                <div key={step.title} style={{ display: "contents" }}>
                  <EcosystemCard
                    title={step.title}
                    subtitle={step.subtitle}
                    text={step.text}
                    image={step.image}
                    href={step.href}
                  />

                  {index < ecosystemSteps.length - 1 && (
                    <EcosystemArrow isMobile={isMobile} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              marginTop: "62px",
              width: "100%",
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: isMobile ? "24px" : "52px",
              maxWidth: "1550px",
              alignItems: "stretch",
              justifyContent: "center",
            }}
          >
            <AboutCard
              imageSrc="/nova/nova-character.png"
              title="Nova’s World"
              audience="Built for ages 6–12"
              description="A gamified learning world where children strengthen English, Mathematics, and Science through Learning Missions while developing thinking skills, creativity, and learning independence."
            />

            <AboutCard
              imageSrc="/milo-world/milo-character.png"
              title="Milo’s World"
              audience="Built for ages 13+"
              description="A real-world skills world where teens build and manage businesses, explore investments, and practise financial decision-making through safe simulations."
            />
          </div>



          <section
            id="inside-dreamscape"
            aria-labelledby="inside-dreamscape-heading"
            style={{
              marginTop: "76px",
              width: "100%",
              maxWidth: "1450px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
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
              See Inside Dreamscape
            </p>

            <h2
              id="inside-dreamscape-heading"
              style={{
                margin: "20px 0 0",
                maxWidth: "980px",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "40px" : "62px",
                fontWeight: 400,
                lineHeight: 1.08,
                color: "white",
                textAlign: "center",
              }}
            >
              More than a game. A complete learning journey.
            </h2>

            <p
              style={{
                margin: "24px 0 0",
                maxWidth: "920px",
                color: "rgba(255,255,255,0.72)",
                fontSize: isMobile ? "17px" : "20px",
                fontWeight: 300,
                lineHeight: 1.72,
                textAlign: "center",
              }}
            >
              Explore curriculum-based missions, understand meaningful progress,
              and practise real-world decision-making in one connected platform.
            </p>

            <div
              style={{
                marginTop: isMobile ? "38px" : "50px",
                width: "100%",
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: isMobile ? "22px" : "26px",
                alignItems: "stretch",
              }}
            >
              {productPreviews.map((preview) => (
                <ProductPreviewCard
                  key={preview.title}
                  eyebrow={preview.eyebrow}
                  title={preview.title}
                  text={preview.text}
                  imageSrc={preview.imageSrc}
                  placeholderLabel={preview.placeholderLabel}
                />
              ))}
            </div>

            <div
              style={{
                marginTop: isMobile ? "34px" : "46px",
                width: "100%",
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: isMobile ? "14px" : "18px",
              }}
            >
              {journeySteps.map((step) => (
                <article
                  key={step.number}
                  style={{
                    minHeight: "178px",
                    padding: "26px 25px",
                    borderRadius: "22px",
                    border: "1px solid rgba(142,232,255,0.18)",
                    background:
                      "linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02))",
                    textAlign: "left",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "#ffbd73",
                      fontSize: "12px",
                      fontWeight: 900,
                      letterSpacing: "0.16em",
                    }}
                  >
                    {step.number}
                  </p>
                  <h3
                    style={{
                      margin: "14px 0 0",
                      color: "white",
                      fontSize: "24px",
                      fontWeight: 800,
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      margin: "13px 0 0",
                      color: "rgba(255,255,255,0.64)",
                      fontSize: "15px",
                      fontWeight: 300,
                      lineHeight: 1.62,
                    }}
                  >
                    {step.text}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section
            id="trust"
            aria-labelledby="trust-heading"
            style={{
              position: "relative",
              marginTop: "72px",
              width: "100%",
              maxWidth: "1450px",
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
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background:
                  "linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.025) 48%, transparent 100%)",
              }}
            />

            <div
              style={{
                position: "relative",
                zIndex: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
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
                Quality & Trust
              </p>

              <h2
                id="trust-heading"
                style={{
                  margin: "20px 0 0",
                  maxWidth: "980px",
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: isMobile ? "39px" : "62px",
                  fontWeight: 400,
                  lineHeight: 1.08,
                  color: "white",
                  textAlign: "center",
                  textShadow: "0 18px 48px rgba(0,0,0,0.38)",
                }}
              >
                Built with AI. Verified by qualified teachers.
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
                Dreamscape One combines the speed and flexibility of AI with
                the experience and judgement of educators. Educational content
                is reviewed for accuracy, clarity, age appropriateness, and
                curriculum relevance before publication.
              </p>

              <div
                style={{
                  marginTop: isMobile ? "38px" : "48px",
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(3, minmax(0, 1fr))",
                  gap: isMobile ? "20px" : "24px",
                  alignItems: "stretch",
                }}
              >
                {trustPoints.map((point) => (
                  <TrustCard
                    key={point.title}
                    title={point.title}
                    text={point.text}
                    imageSrc={point.imageSrc}
                    placeholderLabel={point.placeholderLabel}
                  />
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
                  background:
                    "linear-gradient(135deg, rgba(83,215,255,0.1), rgba(197,140,255,0.11))",
                  boxShadow:
                    "0 16px 40px rgba(0,0,0,0.24), inset 0 0 18px rgba(83,215,255,0.04)",
                  color: "rgba(255,255,255,0.94)",
                  fontSize: isMobile ? "14px" : "16px",
                  fontWeight: 800,
                  lineHeight: 1.4,
                  textAlign: "center",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    color: "#8ee8ff",
                    fontSize: "18px",
                    flexShrink: 0,
                  }}
                >
                  ✓
                </span>
                AI supports the process. Teachers make the final call.
              </div>
            </div>
          </section>

          <section
            id="reviews"
            aria-labelledby="reviews-heading"
            style={{
              marginTop: "76px",
              width: "100%",
              maxWidth: "1450px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
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
              Teaching Experience & Trust
            </p>

            <h2
              id="reviews-heading"
              style={{
                margin: "20px 0 0",
                maxWidth: "980px",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "40px" : "60px",
                fontWeight: 400,
                lineHeight: 1.08,
                color: "white",
                textAlign: "center",
              }}
            >
              Trusted by families. Built from real teaching experience.
            </h2>

            <p
              style={{
                margin: "22px 0 0",
                maxWidth: "850px",
                color: "rgba(255,255,255,0.68)",
                fontSize: isMobile ? "16px" : "19px",
                fontWeight: 300,
                lineHeight: 1.7,
                textAlign: "center",
              }}
            >
              These development-preview quotes must be replaced with genuine,
              permission-cleared reviews before they are published as customer
              testimonials.
            </p>

            <div
              style={{
                marginTop: isMobile ? "36px" : "46px",
                width: "100%",
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: isMobile ? "18px" : "24px",
                alignItems: "stretch",
              }}
            >
              {reviewCards.map((review, index) => (
                <ReviewCard
                  key={`${review.reviewer}-${index}`}
                  quote={review.quote}
                  reviewer={review.reviewer}
                  source={review.source}
                />
              ))}
            </div>
          </section>

          <button
            type="button"
            onClick={() => scrollToSection("home")}
            style={{
              marginTop: "54px",
              padding: "14px 28px",
              borderRadius: "999px",
              border: "1px solid rgba(83,215,255,0.45)",
              background:
                "linear-gradient(135deg, rgba(83,215,255,0.16), rgba(197,140,255,0.12))",
              color: "white",
              fontSize: "14px",
              fontWeight: 400,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow:
                "0 18px 42px rgba(0,0,0,0.32), inset 0 0 18px rgba(83,215,255,0.06)",
              backdropFilter: "blur(12px)",
            }}
          >
            Back to top
          </button>
        </div>
      </section>

      <section
        id="affiliate"
        style={{
          position: "relative",
          padding: isMobile ? "82px 22px" : "112px 7.6vw",
          overflow: "hidden",
          color: "white",
          background:
            "radial-gradient(circle at 14% 28%, rgba(83,215,255,0.16), transparent 28%), radial-gradient(circle at 86% 70%, rgba(255,138,43,0.16), transparent 30%), linear-gradient(135deg, #061326 0%, #130a2d 52%, #24103d 100%)",
          borderTop: "1px solid rgba(116,200,255,0.16)",
          borderBottom: "1px solid rgba(197,140,255,0.18)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.025) 45%, transparent 100%)",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            maxWidth: "1320px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
            gap: isMobile ? "34px" : "74px",
            alignItems: "center",
          }}
        >
          <div style={{ textAlign: isMobile ? "center" : "left" }}>
            <p
              style={{
                margin: 0,
                color: "#8ee8ff",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
              }}
            >
              Dreamscape Affiliate Programme
            </p>

            <h2
              style={{
                margin: "20px 0 0",
                maxWidth: "760px",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "42px" : "66px",
                fontWeight: 400,
                lineHeight: 1.04,
                color: "white",
                textShadow: "0 18px 48px rgba(0,0,0,0.38)",
              }}
            >
              Partner with Dreamscape.
            </h2>

            <p
              style={{
                margin: "24px 0 0",
                maxWidth: "760px",
                color: "rgba(255,255,255,0.72)",
                fontSize: isMobile ? "17px" : "21px",
                fontWeight: 300,
                lineHeight: 1.7,
              }}
            >
              Educators, child-focused businesses, and parenting creators can
              earn commission for up to 12 months per eligible referred
              customer while helping more families discover Dreamscape One.
            </p>

            <div
              style={{
                marginTop: "30px",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: isMobile ? "center" : "flex-start",
                gap: "10px",
              }}
            >
              {[
                "10% regular affiliate commission",
                "Up to 20% for approved KOLs",
                "Maximum 12 months per customer",
              ].map((item) => (
                <span
                  key={item}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "999px",
                    border: "1px solid rgba(142,232,255,0.24)",
                    background: "rgba(255,255,255,0.055)",
                    color: "rgba(255,255,255,0.9)",
                    fontSize: "13px",
                    fontWeight: 700,
                    backdropFilter: "blur(12px)",
                  }}
                >
                  {item}
                </span>
              ))}
            </div>

            <Link
              href="/affiliate/apply"
              style={{
                marginTop: "32px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                minHeight: "54px",
                padding: "14px 24px",
                borderRadius: "999px",
                textDecoration: "none",
                color: "#150a31",
                background:
                  "linear-gradient(90deg, #8ee8ff 0%, #c58cff 58%, #ff9a45 100%)",
                fontSize: "14px",
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                boxShadow:
                  "0 18px 42px rgba(71,33,139,0.34), 0 0 26px rgba(83,215,255,0.12)",
              }}
            >
              Apply to become an affiliate
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div
            style={{
              minHeight: isMobile ? "310px" : "390px",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "30px",
              border: "1px solid rgba(197,140,255,0.3)",
              overflow: "hidden",
              background:
                "radial-gradient(circle at 50% 40%, rgba(197,140,255,0.24), transparent 38%), linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))",
              boxShadow:
                "0 28px 70px rgba(0,0,0,0.34), inset 0 0 30px rgba(83,215,255,0.04)",
              backdropFilter: "blur(16px)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "24px",
                borderRadius: "24px",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            />

            <img
              src="/nova/nova-character.png"
              alt="Nova from Dreamscape One"
              style={{
                position: "absolute",
                left: isMobile ? "10%" : "8%",
                bottom: 0,
                width: isMobile ? "44%" : "48%",
                maxHeight: "92%",
                objectFit: "contain",
                objectPosition: "bottom",
                filter: "drop-shadow(0 22px 32px rgba(0,0,0,0.38))",
              }}
            />

            <img
              src="/home/dreamscape-logo.png"
              alt=""
              aria-hidden="true"
              style={{
                position: "absolute",
                right: "12%",
                top: "15%",
                width: isMobile ? "86px" : "112px",
                height: isMobile ? "86px" : "112px",
                objectFit: "contain",
                opacity: 0.94,
                borderRadius: "999px",
                boxShadow:
                  "0 0 30px rgba(83,215,255,0.25), 0 0 38px rgba(197,140,255,0.22)",
              }}
            />

            <div
              style={{
                position: "absolute",
                right: "8%",
                bottom: "13%",
                width: isMobile ? "44%" : "46%",
                padding: isMobile ? "18px" : "22px",
                borderRadius: "22px",
                border: "1px solid rgba(255,255,255,0.13)",
                background: "rgba(2,8,19,0.66)",
                backdropFilter: "blur(16px)",
                textAlign: "left",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#ffb55f",
                  fontSize: isMobile ? "25px" : "34px",
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              >
                10%
              </p>
              <p
                style={{
                  margin: "8px 0 0",
                  color: "white",
                  fontSize: isMobile ? "14px" : "17px",
                  fontWeight: 800,
                  lineHeight: 1.35,
                }}
              >
                regular commission for up to 12 months per referred customer
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer
        style={{
          position: "relative",
          zIndex: 2,
          padding: "54px 7.6vw 42px",
          background:
            "linear-gradient(180deg, rgba(2,8,19,0.96), rgba(1,4,10,1))",
          borderTop: "1px solid rgba(116,200,255,0.18)",
          color: "white",
        }}
      >
        <div
          style={{
            maxWidth: "1540px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr 1fr",
            gap: isMobile ? "34px" : "42px",
            alignItems: "start",
          }}
        >
          <div>
            <button
              type="button"
              onClick={() => scrollToSection("home")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: 0,
                border: "none",
                background: "transparent",
                color: "white",
                cursor: "pointer",
              }}
            >
              <img
                src="/home/dreamscape-logo.png"
                alt="Dreamscape One logo"
                style={{
                  width: "48px",
                  height: "48px",
                  objectFit: "contain",
                  borderRadius: "999px",
                  boxShadow:
                    "0 0 16px rgba(197,140,255,0.26), 0 0 20px rgba(255,138,43,0.14)",
                }}
              />

              <div style={{ textAlign: "left" }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "17px",
                    letterSpacing: "0.32em",
                    textTransform: "uppercase",
                    color: "white",
                  }}
                >
                  Dreamscape One
                </p>

                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: "11px",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.56)",
                  }}
                >
                  Powered by Guru Kids Pro
                </p>
              </div>
            </button>

            <p
              style={{
                margin: "24px 0 0",
                maxWidth: "440px",
                fontSize: "15px",
                lineHeight: 1.7,
                color: "rgba(255,255,255,0.62)",
                fontWeight: 300,
              }}
            >
              A gamified learning ecosystem that supports children from
              primary-school curriculum mastery to financial literacy,
              entrepreneurship, and real-world life skills.
            </p>
          </div>

          <div>
            <p
              style={{
                margin: 0,
                color: "#8ee8ff",
                fontSize: "13px",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              Explore
            </p>

            <div
              style={{
                marginTop: "18px",
                display: "flex",
                flexDirection: "column",
                gap: "13px",
              }}
            >
              <button
                type="button"
                onClick={() => scrollToSection("home")}
                style={footerButtonStyle}
              >
                Home
              </button>

              <button
                type="button"
                onClick={() => scrollToSection("about")}
                style={footerButtonStyle}
              >
                About
              </button>

              <Link href="/inventor" style={footerLinkStyle}>
                Nova’s World
              </Link>

              <Link href="/milo-world" style={footerLinkStyle}>
                Milo’s World
              </Link>
            </div>
          </div>

          <div>
            <p
              style={{
                margin: 0,
                color: "#8ee8ff",
                fontSize: "13px",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              Connected Sites
            </p>

            <div
              style={{
                marginTop: "18px",
                display: "flex",
                flexDirection: "column",
                gap: "13px",
              }}
            >
              <a
                href="https://gurukidspro.com"
                target="_blank"
                rel="noopener noreferrer"
                style={footerLinkStyle}
              >
                Guru Kids Pro
              </a>

              <Link href="/affiliate/apply" style={footerLinkStyle}>
                Affiliate Programme
              </Link>

              <Link href="/terms" style={footerLinkStyle}>
                Terms & Conditions
              </Link>

              <a
                href="https://www.instagram.com/gurukidspro/"
                target="_blank"
                rel="noopener noreferrer"
                style={footerLinkStyle}
              >
                @gurukidspro
              </a>
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
          <span>
            Learning Missions · Thinking Skills · Financial Literacy · Entrepreneurship
          </span>
        </div>
      </footer>
    </main>
  );
}

function EcosystemCard({
  title,
  subtitle,
  text,
  image,
  href,
}: {
  title: string;
  subtitle: string;
  text: string;
  image: string;
  href?: string;
}) {
  const cardContent = (
    <>
      <div
        style={{
          height: "205px",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "18px 22px 8px",
          background:
            "radial-gradient(circle at center, rgba(83,215,255,0.14), rgba(2,8,19,0.08) 55%, rgba(2,8,19,0.22))",
        }}
      >
        <img
          src={image}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "center",
            display: "block",
            opacity: 1,
            filter: "drop-shadow(0 18px 28px rgba(0,0,0,0.34))",
          }}
        />
      </div>

      <div
        style={{
          minHeight: "185px",
          padding: "26px 28px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          background:
            "linear-gradient(180deg, rgba(2,8,19,0.42), rgba(2,8,19,0.62))",
          borderTop: "1px solid rgba(116,200,255,0.12)",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#8ee8ff",
            fontSize: "13px",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          {subtitle}
        </p>

        <h3
          style={{
            margin: "12px 0 0",
            color: "white",
            fontSize: "28px",
            fontWeight: 500,
            lineHeight: 1.18,
          }}
        >
          {title}
        </h3>

        <p
          style={{
            margin: "16px 0 0",
            color: "rgba(255,255,255,0.68)",
            fontSize: "16px",
            lineHeight: 1.65,
            fontWeight: 300,
            maxWidth: "330px",
          }}
        >
          {text}
        </p>
      </div>
    </>
  );

  const sharedStyle: CSSProperties = {
    minHeight: "390px",
    borderRadius: "24px",
    overflow: "hidden",
    border: "1px solid rgba(116,200,255,0.28)",
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))",
    boxShadow:
      "0 24px 60px rgba(0,0,0,0.34), inset 0 0 24px rgba(83,215,255,0.035)",
    backdropFilter: "blur(16px)",
    textAlign: "center",
    textDecoration: "none",
    color: "white",
    cursor: href ? "pointer" : "default",
    transition:
      "transform 250ms ease, border-color 250ms ease, box-shadow 250ms ease",
  };

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={sharedStyle}
        onMouseEnter={(event) => {
          event.currentTarget.style.transform = "translateY(-6px)";
          event.currentTarget.style.borderColor = "rgba(116,200,255,0.55)";
          event.currentTarget.style.boxShadow =
            "0 30px 80px rgba(0,0,0,0.42), 0 0 26px rgba(83,215,255,0.16)";
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.transform = "translateY(0)";
          event.currentTarget.style.borderColor = "rgba(116,200,255,0.28)";
          event.currentTarget.style.boxShadow =
            "0 24px 60px rgba(0,0,0,0.34), inset 0 0 24px rgba(83,215,255,0.035)";
        }}
      >
        {cardContent}
      </a>
    );
  }

  return <article style={sharedStyle}>{cardContent}</article>;
}

function EcosystemArrow({ isMobile }: { isMobile: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#8ee8ff",
        fontSize: "28px",
        opacity: 0.9,
        minHeight: isMobile ? "18px" : "auto",
      }}
    >
      {isMobile ? "↓" : "→"}
    </div>
  );
}



function ProductPreviewCard({
  eyebrow,
  title,
  text,
  imageSrc,
  placeholderLabel,
}: {
  eyebrow: string;
  title: string;
  text: string;
  imageSrc: string;
  placeholderLabel: string;
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
        background:
          "linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.022))",
        boxShadow:
          "0 26px 66px rgba(0,0,0,0.32), inset 0 0 26px rgba(83,215,255,0.025)",
      }}
    >
      <div
        style={{
          height: "270px",
          minHeight: "270px",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderBottom: "1px solid rgba(142,232,255,0.12)",
          background:
            "radial-gradient(circle at 50% 38%, rgba(83,215,255,0.18), rgba(197,140,255,0.1) 48%, rgba(2,8,19,0.82))",
        }}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={`${title} preview`}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            aria-label={`${placeholderLabel} placeholder`}
            style={{
              width: "calc(100% - 42px)",
              height: "calc(100% - 42px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              borderRadius: "22px",
              border: "1px dashed rgba(142,232,255,0.4)",
              color: "rgba(255,255,255,0.62)",
              padding: "22px",
              boxSizing: "border-box",
            }}
          >
            <span
              aria-hidden="true"
              style={{ fontSize: "34px", color: "#8ee8ff" }}
            >
              ◫
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 900,
                letterSpacing: "0.15em",
                lineHeight: 1.5,
                textTransform: "uppercase",
                textAlign: "center",
              }}
            >
              {placeholderLabel}
            </span>
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          padding: "29px 28px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          textAlign: "left",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#8ee8ff",
            fontSize: "12px",
            fontWeight: 900,
            letterSpacing: "0.19em",
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </p>

        <h3
          style={{
            margin: "13px 0 0",
            color: "white",
            fontSize: "27px",
            fontWeight: 800,
            lineHeight: 1.2,
          }}
        >
          {title}
        </h3>

        <p
          style={{
            margin: "18px 0 0",
            color: "rgba(255,255,255,0.68)",
            fontSize: "16px",
            fontWeight: 300,
            lineHeight: 1.68,
          }}
        >
          {text}
        </p>
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
        background:
          "linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.025))",
        boxShadow:
          "0 22px 58px rgba(0,0,0,0.28), inset 0 0 24px rgba(83,215,255,0.025)",
        backdropFilter: "blur(14px)",
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
          border: imageSrc
            ? "1px solid rgba(142,232,255,0.32)"
            : "1px dashed rgba(142,232,255,0.42)",
          background:
            "radial-gradient(circle at 50% 38%, rgba(83,215,255,0.2), rgba(197,140,255,0.1) 55%, rgba(2,8,19,0.78))",
          boxShadow:
            "0 0 30px rgba(83,215,255,0.13), inset 0 0 22px rgba(83,215,255,0.04)",
        }}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <span
            style={{
              padding: "14px",
              color: "rgba(255,255,255,0.62)",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "0.13em",
              lineHeight: 1.5,
              textTransform: "uppercase",
            }}
          >
            {placeholderLabel}
          </span>
        )}
      </div>

      <h3
        style={{
          margin: "24px 0 0",
          color: "white",
          fontSize: "27px",
          fontWeight: 800,
          lineHeight: 1.2,
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: "18px 0 0",
          color: "rgba(255,255,255,0.68)",
          fontSize: "16px",
          fontWeight: 300,
          lineHeight: 1.68,
        }}
      >
        {text}
      </p>
    </article>
  );
}

function ReviewCard({
  quote,
  reviewer,
  source,
}: {
  quote: string;
  reviewer: string;
  source: string;
}) {
  return (
    <article
      style={{
        minHeight: "285px",
        display: "flex",
        flexDirection: "column",
        padding: "30px 29px",
        borderRadius: "25px",
        border: "1px solid rgba(255,181,95,0.22)",
        background:
          "radial-gradient(circle at 90% 10%, rgba(255,181,95,0.1), transparent 28%), linear-gradient(145deg, rgba(255,255,255,0.065), rgba(255,255,255,0.02))",
        textAlign: "left",
      }}
    >
      <p
        aria-hidden="true"
        style={{
          margin: 0,
          color: "#ffb55f",
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: "48px",
          lineHeight: 0.8,
        }}
      >
        “
      </p>

      <p
        style={{
          margin: "18px 0 0",
          flex: 1,
          color: "rgba(255,255,255,0.82)",
          fontSize: "18px",
          fontWeight: 300,
          lineHeight: 1.65,
          fontStyle: "italic",
        }}
      >
        {quote}
      </p>

      <div
        style={{
          marginTop: "25px",
          paddingTop: "20px",
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "white",
            fontSize: "15px",
            fontWeight: 800,
          }}
        >
          {reviewer}
        </p>
        <p
          style={{
            margin: "7px 0 0",
            color: "#8ee8ff",
            fontSize: "11px",
            fontWeight: 900,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          {source}
        </p>
      </div>
    </article>
  );
}

function AboutCard({
  imageSrc,
  title,
  audience,
  description,
}: {
  imageSrc: string;
  title: string;
  audience: string;
  description: string;
}) {
  return (
    <article
      style={{
        minHeight: "390px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        borderRadius: "24px",
        padding: "42px 40px 40px",
        border: "1px solid rgba(116,200,255,0.42)",
        background:
          "linear-gradient(145deg, rgba(10,27,48,0.74), rgba(2,8,19,0.74))",
        boxShadow:
          "0 28px 70px rgba(0,0,0,0.42), inset 0 0 28px rgba(83,215,255,0.04)",
        backdropFilter: "blur(18px)",
      }}
    >
      <div
        style={{
          width: "142px",
          height: "142px",
          borderRadius: "999px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid rgba(83,215,255,0.5)",
          background:
            "radial-gradient(circle, rgba(83,215,255,0.18), rgba(2,8,19,0.82))",
          boxShadow:
            "0 0 34px rgba(83,215,255,0.28), inset 0 0 22px rgba(83,215,255,0.08)",
          overflow: "hidden",
        }}
      >
        <img
          src={imageSrc}
          alt={title}
          style={{
            width: "132px",
            height: "132px",
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>

      <p
        style={{
          margin: "26px 0 0",
          color: "#8ee8ff",
          fontSize: "13px",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
        }}
      >
        {audience}
      </p>

      <h3
        style={{
          margin: "12px 0 0",
          fontSize: "36px",
          fontWeight: 500,
          lineHeight: 1.2,
          color: "white",
        }}
      >
        {title}
      </h3>

      <div
        style={{
          marginTop: "20px",
          width: "66px",
          height: "1px",
          background: "#53d7ff",
          boxShadow: "0 0 12px rgba(83,215,255,0.7)",
        }}
      />

      <p
        style={{
          margin: "24px 0 0",
          maxWidth: "520px",
          fontSize: "20px",
          fontWeight: 300,
          lineHeight: 1.6,
          color: "rgba(255,255,255,0.72)",
        }}
      >
        {description}
      </p>
    </article>
  );
}
