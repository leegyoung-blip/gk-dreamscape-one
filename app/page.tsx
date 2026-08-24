"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PublicPreviewBanner from "@/components/PublicPreviewBanner";

type Section = "home" | "about";

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
    eyebrow: "Learn",
    title: "Learning Missions",
    text: "Build English, Math, Science and Thinking Skills through curriculum-based missions, topic challenges and progressive practice.",
    imageSrc: "/home/preview-learning-missions.png",
  },
  {
    eyebrow: "Earn & Upgrade",
    title: "Power Nova’s Rover",
    text: "Learning earns Dream Tokens and eligible Dream Gems that can unlock upgrades, strengthen Nova’s rover and open new experiences.",
    imageSrc: "/home/preview-rover.png",
  },
  {
    eyebrow: "Build & Customise",
    title: "Nova’s Home",
    text: "Use what you earn beyond the quiz screen. Furnish Nova’s home, unlock zones, collect items and return to a world that keeps growing.",
    imageSrc: "/home/preview-nova-home.png",
  },
];

const journeySteps = [
  {
    number: "01",
    title: "Learn",
    text: "Complete English, Math, Science and Thinking challenges designed for each learning stage.",
    detail: "Curriculum practice",
  },
  {
    number: "02",
    title: "Earn",
    text: "Collect Dream Tokens, eligible Dream Gems and achievements through meaningful learning activity.",
    detail: "DT · DG · Rewards",
  },
  {
    number: "03",
    title: "Build",
    text: "Upgrade Nova’s rover, customise her home and unlock new experiences that make progress visible.",
    detail: "Rover · Home · Unlocks",
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
          {isNova ? "Ages 6–12 · Nova’s World" : "Ages 13+ · Milo’s World"}
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
            ? "Master English, Math, Science and Thinking Skills through missions, games and rewards in a world built for curious minds."
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

            <Link
              href={world.href}
              style={{
                marginTop: "23px",
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAccount, setIsCheckingAccount] = useState(true);

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

            <nav style={{ marginTop: isMobile ? "40px" : "56px", display: "flex", flexDirection: "column" }}>
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
                  <span aria-hidden="true" style={{ color: "#8ee8ff" }}>→</span>
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
                  <span aria-hidden="true" style={{ color: "#c58cff" }}>→</span>
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
              One connected learning ecosystem for school mastery, thinking, financial literacy and entrepreneurship.
            </p>
          </aside>
        </>
      )}

      <section
        id="home"
        style={{
          position: "relative",
          width: "100vw",
          minHeight: "100vh",
          paddingTop: isMobile ? "72px" : "86px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 7fr) minmax(330px, 3fr)",
          gridTemplateRows: "1fr",
          background: "#020813",
        }}
      >
        <PublicPreviewBanner />
        <WorldPanel world={worlds[0]} isMobile={isMobile} onHowItWorks={() => scrollToId("how-it-works")} />
        <WorldPanel world={worlds[1]} isMobile={isMobile} onHowItWorks={() => scrollToId("how-it-works")} />
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
            aria-labelledby="how-it-works-heading"
            style={{
              width: "100%",
              scrollMarginTop: isMobile ? "92px" : "108px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0, color: "#ffbd73", fontSize: "12px", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
              Why Dreamscape One
            </p>

            <h2
              id="how-it-works-heading"
              style={{
                margin: "18px 0 0",
                maxWidth: "1040px",
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
                maxWidth: "880px",
                color: "rgba(255,255,255,0.72)",
                fontSize: isMobile ? "17px" : "20px",
                fontWeight: 300,
                lineHeight: 1.7,
              }}
            >
              Dreamscape connects curriculum learning with missions, rewards and a persistent world children have a reason to return to.
            </p>

            <div
              style={{
                marginTop: isMobile ? "36px" : "48px",
                width: "100%",
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
                gap: isMobile ? "14px" : "18px",
              }}
            >
              {journeySteps.map((step, index) => (
                <article
                  key={step.number}
                  style={{
                    position: "relative",
                    minHeight: "240px",
                    padding: "28px 27px",
                    borderRadius: "24px",
                    border: "1px solid rgba(142,232,255,0.2)",
                    background:
                      "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.018))",
                    textAlign: "left",
                    boxShadow: "0 22px 58px rgba(0,0,0,0.24)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                    <p style={{ margin: 0, color: "#ffbd73", fontSize: "12px", fontWeight: 900, letterSpacing: "0.16em" }}>
                      {step.number}
                    </p>
                    {!isMobile && index < journeySteps.length - 1 && (
                      <span aria-hidden="true" style={{ color: "rgba(142,232,255,0.5)", fontSize: "22px" }}>→</span>
                    )}
                  </div>

                  <h3 style={{ margin: "16px 0 0", color: "white", fontSize: "28px", fontWeight: 800 }}>
                    {step.title}
                  </h3>
                  <p
                    style={{
                      margin: "15px 0 0",
                      color: "rgba(255,255,255,0.66)",
                      fontSize: "15px",
                      fontWeight: 300,
                      lineHeight: 1.62,
                      maxWidth: "92%",
                    }}
                  >
                    {step.text}
                  </p>
                  <p
                    style={{
                      margin: "auto 0 0",
                      paddingTop: "22px",
                      color: "#8ee8ff",
                      fontSize: "11px",
                      fontWeight: 900,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    {step.detail}
                  </p>
                </article>
              ))}
            </div>

            <p
              style={{
                margin: "30px 0 0",
                color: "rgba(255,255,255,0.84)",
                fontSize: isMobile ? "15px" : "17px",
                fontWeight: 800,
                lineHeight: 1.5,
              }}
            >
              Learning is the engine that moves the adventure forward.
            </p>
          </section>

          <section
            id="inside-dreamscape"
            aria-labelledby="inside-dreamscape-heading"
            style={{
              marginTop: isMobile ? "78px" : "108px",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0, color: "#8ee8ff", fontSize: "13px", fontWeight: 800, letterSpacing: "0.28em", textTransform: "uppercase" }}>
              See Inside Nova
            </p>

            <h2
              id="inside-dreamscape-heading"
              style={{
                margin: "20px 0 0",
                maxWidth: "1000px",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "40px" : "60px",
                fontWeight: 400,
                lineHeight: 1.08,
                color: "white",
              }}
            >
              One learning world. Many reasons to come back.
            </h2>

            <p
              style={{
                margin: "23px 0 0",
                maxWidth: "900px",
                color: "rgba(255,255,255,0.7)",
                fontSize: isMobile ? "17px" : "19px",
                fontWeight: 300,
                lineHeight: 1.72,
              }}
            >
              Curriculum learning powers the rewards, upgrades and spaces children interact with across Nova’s World.
            </p>

            <div
              style={{
                marginTop: isMobile ? "38px" : "50px",
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
          </section>

          <section
            aria-labelledby="grows-heading"
            style={{
              marginTop: isMobile ? "84px" : "112px",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0, color: "#53d7ff", fontSize: "13px", fontWeight: 800, letterSpacing: "0.26em", textTransform: "uppercase" }}>
              One Connected Ecosystem
            </p>

            <h2
              id="grows-heading"
              style={{
                margin: "20px 0 0",
                maxWidth: "1040px",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "42px" : "62px",
                fontWeight: 400,
                lineHeight: 1.08,
                color: "white",
              }}
            >
              A learning world that grows with them.
            </h2>

            <p style={{ margin: "23px 0 0", maxWidth: "780px", color: "rgba(255,255,255,0.68)", fontSize: isMobile ? "17px" : "19px", fontWeight: 300, lineHeight: 1.68 }}>
              Start with curriculum mastery in Nova, then continue into real-world capability with Milo as learners get older.
            </p>

            <div
              style={{
                marginTop: "46px",
                width: "100%",
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.25fr) minmax(0, 0.75fr)",
                gap: isMobile ? "24px" : "30px",
                alignItems: "stretch",
              }}
            >
              <AboutCard
                imageSrc="/nova/nova-character.png"
                title="Nova’s World"
                audience="Ages 6–12"
                items={["English", "Mathematics", "Science", "Thinking Skills"]}
                footer="The learning adventure begins here."
                featured
              />

              <AboutCard
                imageSrc="/milo-world/milo-character.png"
                title="Milo’s World"
                audience="Ages 13+"
                items={["Financial Literacy", "Business", "Entrepreneurship", "Decision Making"]}
                footer="Turn learning into real-world capability."
              />
            </div>
          </section>

          <section
            id="for-parents"
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
            gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr 1fr",
            gap: isMobile ? "34px" : "42px",
            alignItems: "start",
          }}
        >
          <div>
            <button
              type="button"
              onClick={() => scrollToSection("home")}
              style={{ display: "flex", alignItems: "center", gap: "16px", padding: 0, border: "none", background: "transparent", color: "white", cursor: "pointer" }}
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
                  Powered by Guru Kids Pro
                </p>
              </div>
            </button>

            <p style={{ margin: "24px 0 0", maxWidth: "440px", fontSize: "15px", lineHeight: 1.7, color: "rgba(255,255,255,0.62)", fontWeight: 300 }}>
              A gamified learning ecosystem that supports children from primary-school curriculum mastery to financial literacy, entrepreneurship and real-world life skills.
            </p>
          </div>

          <div>
            <p style={{ margin: 0, color: "#8ee8ff", fontSize: "13px", letterSpacing: "0.22em", textTransform: "uppercase" }}>Explore</p>
            <div style={{ marginTop: "18px", display: "flex", flexDirection: "column", gap: "13px" }}>
              <button type="button" onClick={() => scrollToSection("home")} style={footerButtonStyle}>Home</button>
              <button type="button" onClick={() => scrollToSection("about")} style={footerButtonStyle}>About</button>
              <Link href="/inventor" style={footerLinkStyle}>Nova’s World</Link>
              <Link href="/milo-world" style={footerLinkStyle}>Milo’s World</Link>
            </div>
          </div>

          <div>
            <p style={{ margin: 0, color: "#8ee8ff", fontSize: "13px", letterSpacing: "0.22em", textTransform: "uppercase" }}>Connected Sites</p>
            <div style={{ marginTop: "18px", display: "flex", flexDirection: "column", gap: "13px" }}>
              <a href="https://gurukidspro.com" target="_blank" rel="noopener noreferrer" style={footerLinkStyle}>Guru Kids Pro</a>
              <Link href="/affiliate" style={footerLinkStyle}>Affiliate Programme</Link>
              <Link href="/terms" style={footerLinkStyle}>Terms & Conditions</Link>
              <a href="https://www.instagram.com/gurukidspro/" target="_blank" rel="noopener noreferrer" style={footerLinkStyle}>@gurukidspro</a>
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

function ProductPreviewCard({
  eyebrow,
  title,
  text,
  imageSrc,
}: {
  eyebrow: string;
  title: string;
  text: string;
  imageSrc: string;
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

function AboutCard({
  imageSrc,
  title,
  audience,
  items,
  footer,
  featured = false,
}: {
  imageSrc: string;
  title: string;
  audience: string;
  items: string[];
  footer: string;
  featured?: boolean;
}) {
  return (
    <article
      style={{
        minHeight: featured ? "430px" : "410px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        borderRadius: "28px",
        padding: featured ? "44px 42px 40px" : "40px 34px 36px",
        border: featured ? "1px solid rgba(83,215,255,0.5)" : "1px solid rgba(197,140,255,0.34)",
        background: featured
          ? "radial-gradient(circle at 50% 0%, rgba(83,215,255,0.13), transparent 34%), linear-gradient(145deg, rgba(10,27,48,0.78), rgba(2,8,19,0.78))"
          : "radial-gradient(circle at 50% 0%, rgba(197,140,255,0.12), transparent 34%), linear-gradient(145deg, rgba(20,14,42,0.78), rgba(2,8,19,0.78))",
        boxShadow: featured ? "0 30px 76px rgba(0,0,0,0.42), 0 0 36px rgba(83,215,255,0.08)" : "0 26px 66px rgba(0,0,0,0.36)",
      }}
    >
      <div
        style={{
          width: featured ? "150px" : "136px",
          height: featured ? "150px" : "136px",
          borderRadius: "999px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: featured ? "1px solid rgba(83,215,255,0.5)" : "1px solid rgba(197,140,255,0.38)",
          background: featured
            ? "radial-gradient(circle, rgba(83,215,255,0.18), rgba(2,8,19,0.82))"
            : "radial-gradient(circle, rgba(197,140,255,0.16), rgba(2,8,19,0.82))",
          overflow: "hidden",
        }}
      >
        <img src={imageSrc} alt={title} style={{ width: featured ? "140px" : "126px", height: featured ? "140px" : "126px", objectFit: "contain", display: "block" }} />
      </div>

      <p style={{ margin: "25px 0 0", color: featured ? "#8ee8ff" : "#d5b5ff", fontSize: "13px", fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase" }}>
        {audience}
      </p>
      <h3 style={{ margin: "12px 0 0", fontSize: featured ? "38px" : "34px", fontWeight: 500, lineHeight: 1.2, color: "white" }}>
        {title}
      </h3>

      <div style={{ marginTop: "24px", width: "100%", maxWidth: featured ? "500px" : "410px", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "11px" }}>
        {items.map((item) => (
          <div
            key={item}
            style={{
              minHeight: "50px",
              padding: "11px 13px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "14px",
              border: featured ? "1px solid rgba(142,232,255,0.16)" : "1px solid rgba(213,181,255,0.14)",
              background: "rgba(255,255,255,0.045)",
              color: "rgba(255,255,255,0.88)",
              fontSize: "14px",
              fontWeight: 700,
              lineHeight: 1.3,
            }}
          >
            {item}
          </div>
        ))}
      </div>

      <p style={{ margin: "24px 0 0", color: "rgba(255,255,255,0.66)", fontSize: "14px", fontWeight: 700, lineHeight: 1.45 }}>
        {footer}
      </p>
    </article>
  );
}
