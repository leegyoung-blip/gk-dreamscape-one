import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: {
    absolute: "Dreamscape One",
  },
  description:
    "Dreamscape One is a gamified education platform by Guru Kids Pro for curriculum learning, thinking skills, financial literacy and real-world decision-making.",
  alternates: {
    canonical: "https://dreamscape-one.com/about",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function DreamscapeAboutPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 20% 10%, rgba(83,215,255,0.16), transparent 30%), radial-gradient(circle at 85% 80%, rgba(197,140,255,0.16), transparent 32%), #020813",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
        padding: "64px 22px",
      }}
    >
      <article
        style={{
          width: "100%",
          maxWidth: "920px",
          margin: "0 auto",
          padding: "48px 36px",
          borderRadius: "28px",
          border: "1px solid rgba(142,232,255,0.26)",
          background: "rgba(7, 18, 38, 0.94)",
          boxShadow: "0 28px 80px rgba(0,0,0,0.4)",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#8ee8ff",
            fontSize: "13px",
            fontWeight: 800,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          Gamified education platform by Guru Kids Pro
        </p>

        <h1
          style={{
            margin: "18px 0 0",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: "clamp(48px, 8vw, 78px)",
            fontWeight: 400,
            lineHeight: 1.05,
          }}
        >
          Dreamscape One
        </h1>

        <p
          style={{
            margin: "28px 0 0",
            fontSize: "21px",
            lineHeight: 1.7,
            color: "rgba(255,255,255,0.88)",
          }}
        >
          Dreamscape One is a gamified education platform operated by Guru
          Kids Pro. It helps children and teenagers learn independently through
          curriculum-based learning missions, thinking challenges, progress
          tracking, rewards, financial-literacy activities and safe business
          simulations.
        </p>

        <section style={{ marginTop: "42px" }}>
          <h2
            style={{
              margin: 0,
              fontSize: "28px",
              lineHeight: 1.3,
            }}
          >
            What learners can do
          </h2>

          <p
            style={{
              margin: "16px 0 0",
              fontSize: "17px",
              lineHeight: 1.75,
              color: "rgba(255,255,255,0.74)",
            }}
          >
            Nova&apos;s World supports learners aged 6–12 with English,
            Mathematics, Science and thinking-skills practice. Milo&apos;s
            World supports learners aged 13 and above with entrepreneurship,
            financial literacy, investment concepts and real-world
            decision-making simulations.
          </p>
        </section>

        <section style={{ marginTop: "38px" }}>
          <h2
            style={{
              margin: 0,
              fontSize: "28px",
              lineHeight: 1.3,
            }}
          >
            Why Dreamscape One uses Google Sign-In
          </h2>

          <p
            style={{
              margin: "16px 0 0",
              fontSize: "17px",
              lineHeight: 1.75,
              color: "rgba(255,255,255,0.74)",
            }}
          >
            Users may sign in with Google to create or access their Dreamscape
            One account. Signing in allows Dreamscape One to identify the user
            and save their profile, learning progress, quiz results,
            achievements and platform rewards.
          </p>
        </section>

        <section style={{ marginTop: "38px" }}>
          <h2
            style={{
              margin: 0,
              fontSize: "28px",
              lineHeight: 1.3,
            }}
          >
            About the operator
          </h2>

          <p
            style={{
              margin: "16px 0 0",
              fontSize: "17px",
              lineHeight: 1.75,
              color: "rgba(255,255,255,0.74)",
            }}
          >
            Dreamscape One is developed and operated by Guru Kids Pro, a
            Singapore education provider. Educational content is designed for
            curriculum relevance and reviewed by educators before publication.
          </p>
        </section>

        <nav
          aria-label="Dreamscape One links"
          style={{
            marginTop: "44px",
            paddingTop: "28px",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          <Link href="/" style={primaryLinkStyle}>
            Visit Dreamscape One
          </Link>

          <Link href="/login" style={secondaryLinkStyle}>
            Create or access an account
          </Link>

          <Link href="/privacy" style={textLinkStyle}>
            Privacy Policy
          </Link>

          <Link href="/terms" style={textLinkStyle}>
            Terms & Conditions
          </Link>

          <a href="mailto:admin@gurukidspro.com" style={textLinkStyle}>
            Contact Support
          </a>
        </nav>
      </article>
    </main>
  );
}

const primaryLinkStyle: React.CSSProperties = {
  minHeight: "48px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 20px",
  borderRadius: "999px",
  background: "linear-gradient(90deg, #8ee8ff, #c58cff)",
  color: "#08101e",
  fontSize: "14px",
  fontWeight: 800,
  textDecoration: "none",
};

const secondaryLinkStyle: React.CSSProperties = {
  minHeight: "48px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 20px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.28)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  fontSize: "14px",
  fontWeight: 800,
  textDecoration: "none",
};

const textLinkStyle: React.CSSProperties = {
  minHeight: "48px",
  display: "inline-flex",
  alignItems: "center",
  color: "#8ee8ff",
  fontSize: "14px",
  fontWeight: 700,
  textDecoration: "underline",
  textUnderlineOffset: "4px",
};