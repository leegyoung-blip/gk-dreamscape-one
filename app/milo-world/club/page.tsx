"use client";

import Link from "next/link";

export default function MilosClubPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background:
          "radial-gradient(circle at top, rgba(255,183,92,0.18), transparent 36%), linear-gradient(180deg, #140b03, #020813)",
        color: "white",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: "28px 20px 72px",
      }}
    >
      <div
        style={{
          width: "min(1080px, 100%)",
          margin: "0 auto",
        }}
      >
        <Link
          href="/milo-world"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            height: "44px",
            padding: "0 18px",
            borderRadius: "999px",
            border: "1px solid rgba(255,202,140,0.32)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            textDecoration: "none",
            fontSize: "14px",
            boxShadow: "0 16px 36px rgba(0,0,0,0.24)",
          }}
        >
          ← Back to Milo’s World
        </Link>

        <section
          style={{
            marginTop: "64px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#ffd18a",
              fontSize: "13px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontWeight: 800,
            }}
          >
            Milo’s World
          </p>

          <h1
            style={{
              margin: "16px 0 0",
              fontSize: "clamp(46px, 8vw, 86px)",
              lineHeight: 1,
              fontWeight: 800,
              letterSpacing: "-0.055em",
            }}
          >
            Milo’s Club
          </h1>

          <p
            style={{
              margin: "22px auto 0",
              maxWidth: "720px",
              color: "rgba(255,255,255,0.76)",
              fontSize: "clamp(17px, 2.4vw, 21px)",
              lineHeight: 1.55,
            }}
          >
            Exclusive member space for future rewards, drops, advanced games,
            club-only announcements, and 3D printing perks.
          </p>
        </section>

        <section
          style={{
            marginTop: "50px",
            borderRadius: "34px",
            border: "1px solid rgba(255,202,140,0.24)",
            background:
              "linear-gradient(180deg, rgba(112,57,18,0.36), rgba(4,18,42,0.72))",
            padding: "34px",
            boxShadow:
              "inset 0 0 32px rgba(255,202,140,0.04), 0 24px 70px rgba(0,0,0,0.28)",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "clamp(32px, 5vw, 54px)",
              lineHeight: 1.05,
              fontWeight: 800,
              letterSpacing: "-0.045em",
            }}
          >
            Coming Soon
          </h2>

          <p
            style={{
              margin: "18px 0 0",
              maxWidth: "760px",
              color: "rgba(255,255,255,0.72)",
              fontSize: "16px",
              lineHeight: 1.7,
            }}
          >
            This page will become the private Milo’s Club area. Later, we can add
            member-only rewards, design drops, activity bonuses, token
            redemptions, and printing discounts here.
          </p>
        </section>
      </div>
    </main>
  );
}