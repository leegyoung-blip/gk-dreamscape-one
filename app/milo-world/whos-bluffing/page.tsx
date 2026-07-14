"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

export default function WhosBluffingPage() {
  const navButtonStyle: CSSProperties = {
    height: "42px",
    padding: "0 22px",
    borderRadius: "999px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    color: "rgba(255,255,255,0.9)",
    textDecoration: "none",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    fontSize: "13px",
    fontWeight: 800,
    border: "1px solid rgba(255, 190, 120, 0.28)",
    background: "rgba(5,13,28,0.62)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    boxShadow: "0 14px 34px rgba(0,0,0,0.28)",
  };

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100dvh",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 50% 20%, rgba(255,176,83,0.22), transparent 32%), radial-gradient(circle at 20% 80%, rgba(83,215,255,0.14), transparent 30%), #020817",
        color: "white",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, rgba(2,8,23,0.1), rgba(2,8,23,0.72))",
          pointerEvents: "none",
        }}
      />

      <header
        style={{
          position: "relative",
          zIndex: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          padding: "22px",
        }}
      >
        <Link href="/milo-world" style={navButtonStyle}>
          ← Back to Milo’s World
        </Link>

        <Link href="/cart" style={navButtonStyle} aria-label="Open cart">
          🛒
        </Link>
      </header>

      <section
        style={{
          position: "relative",
          zIndex: 2,
          minHeight: "calc(100dvh - 86px)",
          display: "grid",
          placeItems: "center",
          padding: "28px",
        }}
      >
        <div
          style={{
            width: "min(980px, 100%)",
            borderRadius: "34px",
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 36px 110px rgba(0,0,0,0.46)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "42px",
              background:
                "linear-gradient(145deg, rgba(255,176,83,0.16), rgba(83,215,255,0.08))",
              borderBottom: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#ffd18a",
                fontSize: "13px",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                fontWeight: 900,
              }}
            >
              Milo’s Multiplayer Lab
            </p>

            <h1
              style={{
                margin: "16px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: "clamp(48px, 8vw, 82px)",
                lineHeight: 0.95,
                fontWeight: 500,
              }}
            >
              Who’s Bluffing?
            </h1>

            <p
              style={{
                margin: "20px 0 0",
                maxWidth: "680px",
                color: "rgba(255,255,255,0.76)",
                fontSize: "18px",
                lineHeight: 1.6,
              }}
            >
              Create fake answers, spot the truth, and try to fool the room.
              Built for quick multiplayer rounds with 2 to 10 players.
            </p>
          </div>

          <div
            style={{
              padding: "42px",
              display: "grid",
              gap: "18px",
            }}
          >
            <div
              style={{
                borderRadius: "24px",
                border: "1px dashed rgba(255,255,255,0.22)",
                background: "rgba(255,255,255,0.08)",
                padding: "32px",
                textAlign: "center",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "28px",
                  lineHeight: 1.15,
                }}
              >
                Game code area
              </h2>

              <p
                style={{
                  margin: "12px auto 0",
                  maxWidth: "560px",
                  color: "rgba(255,255,255,0.62)",
                  fontSize: "15px",
                  lineHeight: 1.6,
                }}
              >
                Paste the Who’s Bluffing multiplayer game component here when
                the game logic is ready.
              </p>

              <div
                style={{
                  marginTop: "24px",
                  borderRadius: "18px",
                  background: "rgba(2,8,23,0.62)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  padding: "22px",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "14px",
                  lineHeight: 1.6,
                  textAlign: "left",
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                }}
              >
                {"{/* Paste Who’s Bluffing game code here */}"}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "14px",
              }}
            >
              {[
                ["Players", "2–10"],
                ["Style", "Fast group game"],
                ["Rounds", "Quick party rounds"],
                ["Status", "Ready for game code"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    borderRadius: "18px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.07)",
                    padding: "18px",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "#ffd18a",
                      fontSize: "11px",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      fontWeight: 900,
                    }}
                  >
                    {label}
                  </p>
                  <strong
                    style={{
                      display: "block",
                      marginTop: "8px",
                      fontSize: "20px",
                    }}
                  >
                    {value}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}