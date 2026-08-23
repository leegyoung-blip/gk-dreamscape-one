"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isPublicPreviewActive } from "@/lib/public-preview";

export default function PublicPreviewBanner() {
  const [active, setActive] = useState(() => isPublicPreviewActive());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function updatePreviewState() {
      setActive(isPublicPreviewActive());
      setIsMobile(window.innerWidth <= 720);
    }

    updatePreviewState();
    const interval = window.setInterval(updatePreviewState, 60_000);
    window.addEventListener("resize", updatePreviewState);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", updatePreviewState);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (mounted) setIsLoggedIn(Boolean(data.user));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!active) return null;

  return (
    <aside
      aria-label="Dreamscape One Public Preview"
      style={{
        position: "absolute",
        top: isMobile ? "88px" : "104px",
        left: "50%",
        zIndex: 38,
        width: isMobile
          ? "calc(100% - 28px)"
          : "min(1080px, calc(100% - 80px))",
        transform: "translateX(-50%)",
        padding: isMobile ? "16px" : "17px 20px",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "stretch" : "center",
        justifyContent: "space-between",
        gap: isMobile ? "14px" : "24px",
        borderRadius: isMobile ? "22px" : "26px",
        border: "1px solid rgba(142,232,255,0.34)",
        background:
          "linear-gradient(100deg, rgba(5,20,42,0.94), rgba(28,13,61,0.93) 58%, rgba(63,31,16,0.92))",
        boxShadow:
          "0 24px 70px rgba(0,0,0,0.42), 0 0 28px rgba(83,215,255,0.11)",
        backdropFilter: "blur(18px)",
        color: "white",
      }}
    >
      <div style={{ minWidth: 0, textAlign: isMobile ? "center" : "left" }}>
        <p
          style={{
            margin: 0,
            color: "#8ee8ff",
            fontSize: "9px",
            fontWeight: 900,
            letterSpacing: "0.17em",
            textTransform: "uppercase",
          }}
        >
          Public Preview · Until 1 October
        </p>

        <h2
          style={{
            margin: "6px 0 0",
            color: "white",
            fontSize: isMobile ? "19px" : "22px",
            fontWeight: 900,
            lineHeight: 1.12,
            letterSpacing: "0.025em",
            textTransform: "uppercase",
          }}
        >
          Turn Learning Into Adventure
        </h2>

        <p
          style={{
            margin: "7px 0 0",
            maxWidth: "700px",
            color: "rgba(255,255,255,0.82)",
            fontSize: isMobile ? "12px" : "13px",
            fontWeight: 600,
            lineHeight: 1.5,
          }}
        >
          Master English, Maths and Science through missions, games and rewards
          in a connected world built for curious minds.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: "9px",
          flexShrink: 0,
        }}
      >
        <Link
          href={isLoggedIn ? "/profile" : "/login"}
          style={{
            minHeight: "43px",
            padding: "11px 17px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "999px",
            background: "linear-gradient(90deg, #8ee8ff, #c58cff)",
            color: "#100622",
            textDecoration: "none",
            fontSize: "10px",
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {isLoggedIn ? "Enter Dreamscape" : "Create Free Account"}
        </Link>

        <Link
          href="/milo-world/activity-lab"
          style={{
            minHeight: "43px",
            padding: "11px 17px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.26)",
            background: "rgba(255,255,255,0.07)",
            color: "white",
            textDecoration: "none",
            fontSize: "10px",
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          Explore Free Activities
        </Link>
      </div>
    </aside>
  );
}
