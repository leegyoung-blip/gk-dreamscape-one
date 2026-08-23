"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PublicPreviewBanner from "@/components/PublicPreviewBanner";

type Section = "home" | "about";
type FirstVisitInterest = "school-learning" | "life-skills" | "exploring";

const FIRST_VISIT_KEY = "dreamscape-first-visit-complete";
const FIRST_VISIT_INTEREST_KEY = "dreamscape-first-visit-interest";

const firstVisitDestinations: Record<FirstVisitInterest, string | null> = {
  "school-learning": "/inventor",
  "life-skills": "/milo-world",
  exploring: null,
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
    title: "Learn",
    text: "Build strong foundations through structured learning designed for each stage.",
  },
  {
    number: "02",
    title: "Play",
    text: "Put learning into action through missions, games, challenges, and simulations.",
  },
  {
    number: "03",
    title: "Earn",
    text: "Collect DreamTokens, DreamGems, rewards, and achievements as you progress.",
  },
  {
    number: "04",
    title: "Progress",
    text: "Unlock new experiences while keeping learning progress clear and meaningful.",
  },
];

const reviewCards = [
  {
    quote:
      "Dreamscape One turns learning into something students actively participate in. The missions are engaging, structured and useful for reinforcing key skills.",
    reviewer: "Education professional",
  },
  {
    quote:
      "My child is more willing to practise independently because the activities feel like challenges rather than extra homework. I also like that progress is organised clearly.",
    reviewer: "Parent",
  },
  {
    quote:
      "I like earning rewards and moving through the missions. It makes learning feel more fun, and Milo’s World lets me try decisions I would not normally get to make.",
    reviewer: "Secondary 2 student",
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
  onCreateAccount,
  onContinue,
}: {
  isMobile: boolean;
  onCreateAccount: (interest: FirstVisitInterest) => void;
  onContinue: (interest: FirstVisitInterest) => void;
}) {
  const [selectedInterest, setSelectedInterest] =
    useState<FirstVisitInterest | null>(null);

  const interestOptions: Array<{
    key: FirstVisitInterest;
    eyebrow: string;
    title: string;
    description: string;
    destination: string;
    accent: string;
  }> = [
    {
      key: "school-learning",
      eyebrow: "Explore Nova",
      title: "School Learning",
      description:
        "English, Mathematics, Science and thinking skills through structured learning missions.",
      destination: "Nova’s World",
      accent: "#53d7ff",
    },
    {
      key: "life-skills",
      eyebrow: "Explore Milo",
      title: "Life Skills",
      description:
        "Money, business, decision-making and real-world skills through safe simulations.",
      destination: "Milo’s World",
      accent: "#c58cff",
    },
    {
      key: "exploring",
      eyebrow: "See Everything",
      title: "Just Exploring",
      description:
        "Take a look around Dreamscape One and discover both worlds before choosing.",
      destination: "Dreamscape One",
      accent: "#ffbd73",
    },
  ];

  const selectedOption = interestOptions.find(
    (option) => option.key === selectedInterest,
  );

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
        background: "rgba(1,4,11,0.8)",
        backdropFilter: "blur(14px)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: selectedInterest ? "680px" : "900px",
          maxHeight: "calc(100vh - 36px)",
          overflowY: "auto",
          borderRadius: isMobile ? "24px" : "32px",
          padding: isMobile ? "32px 20px 26px" : "44px 44px 38px",
          border: "1px solid rgba(116,200,255,0.35)",
          background:
            "radial-gradient(circle at 12% 0%, rgba(83,215,255,0.18), transparent 36%), radial-gradient(circle at 100% 100%, rgba(197,140,255,0.18), transparent 38%), rgba(3,10,23,0.97)",
          boxShadow:
            "0 34px 100px rgba(0,0,0,0.58), inset 0 0 38px rgba(83,215,255,0.04)",
          color: "white",
          textAlign: "center",
          transition: "max-width 250ms ease",
        }}
      >
        <img
          src="/home/dreamscape-logo.png"
          alt="Dreamscape One logo"
          style={{
            width: isMobile ? "60px" : "70px",
            height: isMobile ? "60px" : "70px",
            objectFit: "contain",
            borderRadius: "999px",
            boxShadow:
              "0 0 22px rgba(83,215,255,0.25), 0 0 28px rgba(197,140,255,0.22)",
          }}
        />

        <p
          style={{
            margin: "20px 0 0",
            color: "#8ee8ff",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
          }}
        >
          Welcome to Dreamscape One
        </p>

        {!selectedInterest ? (
          <>
            <h2
              id="first-visit-title"
              style={{
                margin: "14px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "35px" : "48px",
                fontWeight: 400,
                lineHeight: 1.08,
              }}
            >
              What would you like to explore?
            </h2>

            <p
              style={{
                margin: "18px auto 0",
                maxWidth: "650px",
                color: "rgba(255,255,255,0.7)",
                fontSize: isMobile ? "16px" : "18px",
                lineHeight: 1.6,
                fontWeight: 300,
              }}
            >
              Choose what interests you most. You can explore everything later.
            </p>

            <div
              style={{
                marginTop: "30px",
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: "14px",
              }}
            >
              {interestOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSelectedInterest(option.key)}
                  style={{
                    minHeight: isMobile ? "150px" : "210px",
                    padding: isMobile ? "22px 20px" : "28px 24px",
                    borderRadius: "20px",
                    border: `1px solid ${option.accent}55`,
                    background:
                      "linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))",
                    color: "white",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    transition:
                      "transform 200ms ease, border-color 200ms ease, background 200ms ease, box-shadow 200ms ease",
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.transform = "translateY(-4px)";
                    event.currentTarget.style.borderColor = option.accent;
                    event.currentTarget.style.background =
                      "linear-gradient(145deg, rgba(83,215,255,0.11), rgba(197,140,255,0.09))";
                    event.currentTarget.style.boxShadow =
                      "0 18px 38px rgba(0,0,0,0.28)";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.transform = "translateY(0)";
                    event.currentTarget.style.borderColor = `${option.accent}55`;
                    event.currentTarget.style.background =
                      "linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))";
                    event.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <span
                    style={{
                      color: option.accent,
                      fontSize: "11px",
                      fontWeight: 900,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                    }}
                  >
                    {option.eyebrow}
                  </span>

                  <span
                    style={{
                      marginTop: "13px",
                      fontSize: isMobile ? "24px" : "27px",
                      fontWeight: 800,
                      lineHeight: 1.18,
                    }}
                  >
                    {option.title}
                  </span>

                  <span
                    style={{
                      marginTop: "12px",
                      color: "rgba(255,255,255,0.67)",
                      fontSize: "15px",
                      fontWeight: 300,
                      lineHeight: 1.55,
                    }}
                  >
                    {option.description}
                  </span>

                  <span
                    style={{
                      marginTop: "auto",
                      paddingTop: "18px",
                      color: "rgba(255,255,255,0.9)",
                      fontSize: "13px",
                      fontWeight: 800,
                    }}
                  >
                    {option.destination} →
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2
              id="first-visit-title"
              style={{
                margin: "14px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "35px" : "46px",
                fontWeight: 400,
                lineHeight: 1.08,
              }}
            >
              Create your free account
            </h2>

            <p
              style={{
                margin: "18px auto 0",
                maxWidth: "560px",
                color: "rgba(255,255,255,0.74)",
                fontSize: isMobile ? "16px" : "18px",
                lineHeight: 1.6,
                fontWeight: 300,
              }}
            >
              Get <strong style={{ color: "white" }}>100 bonus DreamTokens</strong>{" "}
              when you create an account now, plus access to Daily Games.
            </p>

            <div
              style={{
                margin: "28px auto 0",
                maxWidth: "500px",
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: "10px",
                textAlign: "left",
              }}
            >
              {["100 bonus DreamTokens", "Access Daily Games", "Save your progress", "Build your Dreamscape profile"].map(
                (benefit) => (
                  <div
                    key={benefit}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "9px",
                      minHeight: "44px",
                      padding: "10px 12px",
                      borderRadius: "14px",
                      border: "1px solid rgba(142,232,255,0.15)",
                      background: "rgba(255,255,255,0.045)",
                      color: "rgba(255,255,255,0.82)",
                      fontSize: "14px",
                      lineHeight: 1.35,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{ color: "#8ee8ff", fontWeight: 900 }}
                    >
                      ✓
                    </span>
                    {benefit}
                  </div>
                ),
              )}
            </div>

            <button
              type="button"
              onClick={() => onCreateAccount(selectedInterest)}
              style={{
                marginTop: "28px",
                width: "100%",
                maxWidth: "500px",
                minHeight: "58px",
                border: "none",
                borderRadius: "999px",
                padding: "14px 24px",
                background:
                  "linear-gradient(90deg, #8ee8ff 0%, #c58cff 58%, #ff9a45 100%)",
                color: "#150a31",
                fontSize: "15px",
                fontWeight: 900,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: "pointer",
                boxShadow:
                  "0 18px 42px rgba(71,33,139,0.34), 0 0 26px rgba(83,215,255,0.12)",
              }}
            >
              Create Free Account + Get 100 DreamTokens
            </button>

            <button
              type="button"
              onClick={() => onContinue(selectedInterest)}
              style={{
                marginTop: "16px",
                border: "none",
                background: "transparent",
                color: "rgba(255,255,255,0.64)",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: "4px",
              }}
            >
              Continue without an account
            </button>

            <div
              style={{
                marginTop: "22px",
                paddingTop: "20px",
                borderTop: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                You selected {selectedOption?.title}. We’ll take you to{" "}
                {selectedOption?.destination} next.
              </p>

              <button
                type="button"
                onClick={() => setSelectedInterest(null)}
                style={{
                  marginTop: "12px",
                  border: "none",
                  background: "transparent",
                  color: "#8ee8ff",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                ← Change selection
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();

  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
    if (!showFirstVisitPopup) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showFirstVisitPopup]);

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

  function saveFirstVisitChoice(interest: FirstVisitInterest) {
    window.localStorage.setItem(FIRST_VISIT_KEY, "true");
    window.localStorage.setItem(FIRST_VISIT_INTEREST_KEY, interest);
  }

  function handleFirstVisitContinue(interest: FirstVisitInterest) {
    saveFirstVisitChoice(interest);
    setShowFirstVisitPopup(false);

    const destination = firstVisitDestinations[interest];

    if (destination) {
      router.push(destination);
    }
  }

  function handleFirstVisitCreateAccount(interest: FirstVisitInterest) {
    saveFirstVisitChoice(interest);
    setShowFirstVisitPopup(false);

    const destination = firstVisitDestinations[interest] ?? "/";
    const nextPath = encodeURIComponent(destination);

    router.push(`/login?mode=signup&next=${nextPath}`);
  }

  function scrollToSection(section: Section) {
    const targetId = section === "home" ? "home" : "about";
    scrollToId(targetId);
  }

  function scrollToId(targetId: string) {
    setIsMenuOpen(false);

    window.setTimeout(() => {
      const target = document.getElementById(targetId);
      if (!target) return;

      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 40);
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
        <FirstVisitPopup
          isMobile={isMobile}
          onCreateAccount={handleFirstVisitCreateAccount}
          onContinue={handleFirstVisitContinue}
        />
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "18px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <img
                  src="/home/dreamscape-logo.png"
                  alt=""
                  aria-hidden="true"
                  style={{
                    width: "42px",
                    height: "42px",
                    objectFit: "contain",
                    borderRadius: "999px",
                  }}
                />
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                  }}
                >
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

            <nav
              style={{
                marginTop: isMobile ? "40px" : "56px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {[
                { label: "HOME", target: "home" },
                { label: "HOW IT WORKS", target: "how-it-works" },
                { label: "FOR PARENTS", target: "for-parents" },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => scrollToId(item.target)}
                  style={{
                    minHeight: "66px",
                    padding: "0 4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "18px",
                    border: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                    background: "transparent",
                    color: "white",
                    textAlign: "left",
                    fontSize: isMobile ? "17px" : "19px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    cursor: "pointer",
                  }}
                >
                  {item.label}
                  <span aria-hidden="true" style={{ color: "#8ee8ff" }}>
                    →
                  </span>
                </button>
              ))}

              {[
                { label: "FOR TUITION CENTRES", href: "/education-licence" },
                { label: "PARTNER WITH US", href: "/affiliate" },
                { label: "PRICING", href: "/pricing" },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  style={{
                    minHeight: "66px",
                    padding: "0 4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "18px",
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                    color: "white",
                    textDecoration: "none",
                    textAlign: "left",
                    fontSize: isMobile ? "17px" : "19px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                  }}
                >
                  {item.label}
                  <span aria-hidden="true" style={{ color: "#c58cff" }}>
                    →
                  </span>
                </Link>
              ))}
            </nav>

            <p
              style={{
                margin: "auto 0 0",
                paddingTop: "34px",
                color: "rgba(255,255,255,0.48)",
                fontSize: "13px",
                lineHeight: 1.6,
              }}
            >
              One connected learning ecosystem for school mastery, thinking,
              financial literacy, and entrepreneurship.
            </p>
          </aside>
        </>
      )}

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
            A learning world that grows with them.
          </h2>

          <p
            style={{
              margin: "24px 0 0",
              maxWidth: "760px",
              fontSize: isMobile ? "17px" : "20px",
              fontWeight: 300,
              lineHeight: 1.65,
              color: "rgba(255,255,255,0.7)",
              textAlign: "center",
            }}
          >
            One connected ecosystem. Two worlds designed for different stages
            of learning and growing up.
          </p>

          <div
            style={{
              marginTop: "52px",
              width: "100%",
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: isMobile ? "24px" : "52px",
              maxWidth: "1320px",
              alignItems: "stretch",
              justifyContent: "center",
            }}
          >
            <AboutCard
              imageSrc="/nova/nova-character.png"
              title="Nova’s World"
              audience="Ages 6–12"
              items={["English", "Mathematics", "Science", "Thinking Skills"]}
            />

            <AboutCard
              imageSrc="/milo-world/milo-character.png"
              title="Milo’s World"
              audience="Ages 13+"
              items={[
                "Financial Literacy",
                "Business",
                "Entrepreneurship",
                "Real-World Decision Making",
              ]}
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
              id="how-it-works"
              style={{
                marginTop: isMobile ? "48px" : "64px",
                width: "100%",
                scrollMarginTop: isMobile ? "92px" : "108px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#ffbd73",
                  fontSize: "12px",
                  fontWeight: 900,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  textAlign: "center",
                }}
              >
                How It Works
              </p>

              <h3
                style={{
                  margin: "14px 0 0",
                  color: "white",
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: isMobile ? "34px" : "48px",
                  fontWeight: 400,
                  lineHeight: 1.1,
                  textAlign: "center",
                }}
              >
                Learn. Play. Earn. Progress.
              </h3>

              <div
                style={{
                  marginTop: isMobile ? "28px" : "34px",
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(4, minmax(0, 1fr))",
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
            </div>
          </section>

          <section
            id="for-parents"
            aria-labelledby="trust-heading"
            style={{
              position: "relative",
              marginTop: "72px",
              scrollMarginTop: isMobile ? "92px" : "108px",
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

              <Link href="/affiliate" style={footerLinkStyle}>
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
}: {
  quote: string;
  reviewer: string;
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
      </div>
    </article>
  );
}

function AboutCard({
  imageSrc,
  title,
  audience,
  items,
}: {
  imageSrc: string;
  title: string;
  audience: string;
  items: string[];
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
          fontWeight: 800,
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

      <div
        style={{
          marginTop: "26px",
          width: "100%",
          maxWidth: "430px",
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "12px",
        }}
      >
        {items.map((item) => (
          <div
            key={item}
            style={{
              minHeight: "52px",
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "15px",
              border: "1px solid rgba(142,232,255,0.16)",
              background: "rgba(255,255,255,0.045)",
              color: "rgba(255,255,255,0.88)",
              fontSize: "15px",
              fontWeight: 700,
              lineHeight: 1.3,
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </article>
  );
}
