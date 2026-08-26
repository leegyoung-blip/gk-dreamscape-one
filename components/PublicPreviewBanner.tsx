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
        top: isMobile ? "84px" : "102px",
        left: "50%",
        zIndex: 38,
        width: isMobile ? "calc(100% - 28px)" : "min(760px, calc(100% - 80px))",
        transform: "translateX(-50%)",
        minHeight: isMobile ? "46px" : "50px",
        padding: isMobile ? "9px 12px" : "9px 12px 9px 18px",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: isMobile ? "8px" : "14px",
        borderRadius: "999px",
        border: "1px solid rgba(142,232,255,0.3)",
        background: "rgba(4,14,30,0.86)",
        boxShadow: "0 16px 44px rgba(0,0,0,0.34)",
        backdropFilter: "blur(18px)",
        color: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          minWidth: 0,
          textAlign: isMobile ? "center" : "left",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: "7px",
            height: "7px",
            borderRadius: "999px",
            background: "#8ee8ff",
            boxShadow: "0 0 12px rgba(142,232,255,0.8)",
            flexShrink: 0,
          }}
        />
        <p
          style={{
            margin: 0,
            color: "rgba(255,255,255,0.9)",
            fontSize: isMobile ? "9px" : "10px",
            fontWeight: 900,
            letterSpacing: "0.13em",
            textTransform: "uppercase",
            whiteSpace: isMobile ? "normal" : "nowrap",
          }}
        >
          Public Preview · Until 1 October
        </p>
      </div>

      <Link
        href={isLoggedIn ? "/profile" : "/login?mode=signup"}
        style={{
          minHeight: "34px",
          padding: "8px 14px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "999px",
          background: "linear-gradient(90deg, #8ee8ff, #c58cff)",
          color: "#100622",
          textDecoration: "none",
          fontSize: "9px",
          fontWeight: 900,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {isLoggedIn ? "Enter Dreamscape" : "Create Free Account"}
      </Link>
    </aside>
  );
}
