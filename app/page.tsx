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
    eyebrow: "Curriculum Missions",
    title: "Master the School Curriculum",
    text: "Build English, Mathematics and Science skills through progressive missions, topic challenges and meaningful practice designed to feel like part of the adventure.",
    imageSrc: "/home/preview-learning-missions.png",
  },
  {
    eyebrow: "Explore & Upgrade",
    title: "Power Nova’s Rover",
    text: "Learning earns Dream Tokens and eligible Dream Gems that can unlock upgrades, strengthen Nova’s rover and open new experiences across Skyforge.",
    imageSrc: "/home/preview-rover.png",
  },
  {
    eyebrow: "Build Your World",
    title: "Make Nova’s World Your Own",
    text: "Use what you earn beyond the quiz screen. Furnish Nova’s home, unlock zones, collect items and return to a world that keeps growing with your progress.",
    imageSrc: "/home/preview-nova-home.png",
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
                { label: "NOVA+ FOR PARENTS", target: "for-parents" },
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
                  meta: "M.Ed (Gifted Ed), PGDE, B.A. · Chief Curriculum Developer, Guru Kids Pro",
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
              Student Access
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
              Start with 7 days free.
            </h2>

            <p
              style={{
                margin: "22px 0 0",
                maxWidth: "820px",
                color: "rgba(255,255,255,0.7)",
                fontSize: isMobile ? "16px" : "19px",
                fontWeight: 300,
                lineHeight: 1.7,
              }}
            >
              Every first-time DREAMSCAPE user can try Student Access free for 7 days. Choose the plan that fits your learner, explore the full experience, and continue only if it works for your family.
            </p>

            <div
              style={{
                marginTop: isMobile ? "30px" : "36px",
                width: "100%",
                maxWidth: "980px",
                padding: isMobile ? "18px 18px" : "20px 26px",
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
                  fontSize: isMobile ? "28px" : "32px",
                  fontWeight: 900,
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                7 DAYS FREE
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
                For all first-time users · One introductory trial per user
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
                  minHeight: isMobile ? "auto" : "420px",
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
                <p style={{ margin: "8px 0 0", color: "#8ee8ff", fontSize: "13px", fontWeight: 800 }}>
                  First 7 days free for new users
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
                  {["Primary 1–6 English", "Primary 1–6 Mathematics", "Think Missions & Knowledge Arena", "Progress insights, DT & DG rewards"].map((feature) => (
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
                  minHeight: isMobile ? "auto" : "420px",
                  padding: isMobile ? "29px 24px" : "36px 34px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  textAlign: "left",
                  borderRadius: "28px",
                  border: "1px solid rgba(255,174,92,0.72)",
                  background:
                    "radial-gradient(circle at 88% 0%, rgba(255,174,92,0.16), transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.085), rgba(255,255,255,0.022))",
                  boxShadow: "0 28px 78px rgba(0,0,0,0.32), 0 0 32px rgba(255,174,92,0.08)",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "18px",
                    right: "18px",
                    padding: "7px 11px",
                    borderRadius: "999px",
                    background: "#ffae5c",
                    color: "#1b0c26",
                    fontSize: "9px",
                    fontWeight: 900,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Best Value
                </span>
                <p
                  style={{
                    margin: 0,
                    paddingRight: "96px",
                    color: "#ffbd73",
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  English + Mathematics + Science
                </p>
                <h3 style={{ margin: "14px 0 0", color: "white", fontSize: isMobile ? "30px" : "34px", fontWeight: 800 }}>
                  Full Access
                </h3>
                <div style={{ marginTop: "21px", display: "flex", alignItems: "flex-end", gap: "8px" }}>
                  <span style={{ color: "rgba(255,255,255,0.54)", fontSize: "15px", paddingBottom: "6px" }}>SGD</span>
                  <span style={{ color: "white", fontSize: isMobile ? "43px" : "49px", fontWeight: 900, lineHeight: 1 }}>24.90</span>
                  <span style={{ color: "rgba(255,255,255,0.52)", fontSize: "14px", paddingBottom: "6px" }}>/month</span>
                </div>
                <p style={{ margin: "8px 0 0", color: "#8ee8ff", fontSize: "13px", fontWeight: 800 }}>
                  First 7 days free for new users
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
                  {["Everything in Core Missions", "Primary 1–6 Science", "Complete three-subject Learning Missions", "Science progress & mastery tracking"].map((feature) => (
                    <div key={feature} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                      <span aria-hidden="true" style={{ color: "#ffbd73", fontWeight: 900 }}>✓</span>
                      <span style={{ color: "rgba(255,255,255,0.78)", fontSize: "15px", lineHeight: 1.5 }}>{feature}</span>
                    </div>
                  ))}
                </div>
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
              Monthly prices shown. Annual plans and additional plan details are available on the pricing page.
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
              Start Your 7-Day Free Trial →
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
              Introductory trial is available once per first-time user. Subscription terms and billing details are shown before checkout.
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
  const novaSkills = ["English", "Mathematics", "Science", "Thinking Skills"];
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
        audience="Ages 13+"
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
