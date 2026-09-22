"use client";

import Link from "next/link";
import { useState } from "react";

export default function ExploreHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 80,
          height: "74px",
          padding: "0 clamp(16px, 4vw, 46px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "18px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(2,8,19,0.93)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          color: "white",
        }}
      >
        <Link
          href="/"
          style={{
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            color: "white",
            textDecoration: "none",
          }}
        >
          <img
            src="/home/dreamscape-logo.png"
            alt="Dreamscape One"
            style={{
              width: "42px",
              height: "42px",
              objectFit: "contain",
              borderRadius: "999px",
              flexShrink: 0,
              boxShadow: "0 0 18px rgba(197,140,255,0.2)",
            }}
          />
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            Dreamscape One
          </span>
        </Link>

        <nav
          aria-label="Explore Dreamscape navigation"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div className="explore-desktop-nav" style={{ display: "flex", gap: "8px" }}>
            {[
              ["Explore", "/explore"],
              ["How It Works", "/how-it-works"],
              ["Pricing", "/pricing"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                style={{
                  minHeight: "40px",
                  padding: "0 15px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.035)",
                  color: "rgba(255,255,255,0.84)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textDecoration: "none",
                  fontSize: "10px",
                  fontWeight: 900,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                }}
              >
                {label}
              </Link>
            ))}
          </div>

          <button
            type="button"
            aria-label="Open Explore menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
            className="explore-mobile-menu-button"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "999px",
              border: "1px solid rgba(142,232,255,0.28)",
              background: "rgba(83,215,255,0.08)",
              color: "white",
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "17px",
            }}
          >
            ☰
          </button>
        </nav>
      </header>

      {menuOpen && (
        <div
          style={{
            position: "fixed",
            top: "74px",
            left: 0,
            right: 0,
            zIndex: 79,
            padding: "10px 14px 14px",
            borderBottom: "1px solid rgba(142,232,255,0.15)",
            background: "rgba(2,8,19,0.985)",
            boxShadow: "0 20px 44px rgba(0,0,0,0.34)",
          }}
        >
          {[
            ["Explore Dreamscape", "/explore"],
            ["How It Works", "/how-it-works"],
            ["Pricing", "/pricing"],
            ["Dreamscape Home", "/"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              style={{
                minHeight: "50px",
                padding: "0 8px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                textDecoration: "none",
                fontSize: "13px",
                fontWeight: 800,
              }}
            >
              {label}
              <span style={{ color: "#8ee8ff" }}>→</span>
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 720px) {
          .explore-desktop-nav { display: none !important; }
          .explore-mobile-menu-button { display: flex !important; }
        }
      `}</style>
    </>
  );
}
