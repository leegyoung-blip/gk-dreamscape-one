"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

type BuilderTrack = {
  title: string;
  description: string;
  accent: string;
  status: "open-soon" | "active";
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

export default function JoinUsPage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function checkScreen() {
      setIsMobile(window.innerWidth <= 900);
    }
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

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
                  .getElementById("builder-tracks")
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
              onClick={() =>
                document
                  .getElementById("pitch-yourself")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
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
            Tell us what you are good at, what you want to learn, and what you think you could build for Dreamscape. The application flow will be added in the next phase.
          </p>
          <div
            style={{
              marginTop: "24px",
              display: "inline-flex",
              padding: "10px 13px",
              borderRadius: "999px",
              border: "1px solid rgba(246,196,83,0.22)",
              background: "rgba(246,196,83,0.055)",
              color: "#f6c453",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Application form arrives in Phase 2
          </div>
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
