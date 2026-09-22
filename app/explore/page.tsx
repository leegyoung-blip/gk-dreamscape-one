import type { Metadata } from "next";
import GuideCard from "@/components/explore/GuideCard";
import ExploreHeader from "@/components/explore/ExploreHeader";
import ExploreFooter from "@/components/explore/ExploreFooter";
import {
  DREAMSCAPE_GUIDES,
  GUIDE_CATEGORIES,
} from "@/lib/dreamscape-guides";

export const metadata: Metadata = {
  title: "Explore Dreamscape One",
  description:
    "Understand how Dreamscape One, Nova, Milo, NOVA+, Learning Missions and the reward economy fit together.",
  alternates: {
    canonical: "https://dreamscape-one.com/explore",
  },
  openGraph: {
    title: "Explore Dreamscape One",
    description:
      "Understand the worlds, learning system, rewards and parent intelligence behind Dreamscape One.",
    url: "https://dreamscape-one.com/explore",
    siteName: "Dreamscape One",
    type: "website",
  },
};

export default function ExploreDreamscapePage() {
  const featured =
    DREAMSCAPE_GUIDES.find((guide) => guide.featured) ??
    DREAMSCAPE_GUIDES[0];

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 50% -4%, rgba(83,215,255,0.16), transparent 28%), radial-gradient(circle at 86% 26%, rgba(197,140,255,0.1), transparent 24%), radial-gradient(circle at 14% 58%, rgba(255,174,92,0.08), transparent 24%), #020813",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <ExploreHeader />

      <section
        style={{
          width: "100%",
          maxWidth: "1380px",
          margin: "0 auto",
          padding: "clamp(72px, 9vw, 126px) clamp(20px, 5vw, 64px) 110px",
        }}
      >
        <header
          style={{
            maxWidth: "980px",
            textAlign: "left",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#8ee8ff",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            Explore Dreamscape One
          </p>

          <h1
            style={{
              margin: "20px 0 0",
              maxWidth: "920px",
              color: "white",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: "clamp(48px, 8vw, 82px)",
              fontWeight: 400,
              lineHeight: 1.02,
              letterSpacing: "-0.025em",
            }}
          >
            Understand the world behind the learning.
          </h1>

          <p
            style={{
              margin: "26px 0 0",
              maxWidth: "860px",
              color: "rgba(255,255,255,0.7)",
              fontSize: "clamp(17px, 2vw, 21px)",
              fontWeight: 300,
              lineHeight: 1.72,
            }}
          >
            Dreamscape Guides are written for parents first. They explain what
            children are doing, why each part of the experience exists, and how
            the learning, rewards and wider worlds connect.
          </p>
        </header>

        <div style={{ marginTop: "48px" }}>
          <GuideCard guide={featured} large />
        </div>

        {GUIDE_CATEGORIES.map((category) => {
          const guides = DREAMSCAPE_GUIDES.filter(
            (guide) => guide.category === category && !guide.featured,
          );

          if (!guides.length) return null;

          const intro =
            category === "Start Here"
              ? "Begin with the big picture and the practical questions parents usually ask first."
              : category === "Explore the Worlds"
                ? "See what learners actually do across Nova and Milo, and how the systems connect."
                : "Go deeper into the thinking behind NOVA+, financial literacy and Dreamscape’s wider learning direction.";

          return (
            <section key={category} style={{ marginTop: "78px" }}>
              <p
                style={{
                  margin: 0,
                  color:
                    category === "Start Here"
                      ? "#8ee8ff"
                      : category === "Explore the Worlds"
                        ? "#ffbd73"
                        : "#c58cff",
                  fontSize: "10px",
                  fontWeight: 900,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                {category}
              </p>

              <p
                style={{
                  margin: "12px 0 0",
                  maxWidth: "760px",
                  color: "rgba(255,255,255,0.52)",
                  fontSize: "14px",
                  lineHeight: 1.65,
                }}
              >
                {intro}
              </p>

              <div
                style={{
                  marginTop: "26px",
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(270px, 1fr))",
                  gap: "18px",
                }}
              >
                {guides.map((guide) => (
                  <GuideCard key={guide.slug} guide={guide} />
                ))}
              </div>
            </section>
          );
        })}
      </section>

      <ExploreFooter />
    </main>
  );
}
