"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabase";

type AccessState = "checking" | "admin" | "blocked";

export default function AdminOnlyInventorHubGate({
  children,
}: {
  children: ReactNode;
}) {
  const [accessState, setAccessState] = useState<AccessState>("checking");

  useEffect(() => {
    let mounted = true;

    async function checkAdminAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        setAccessState("blocked");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.warn(
          "Could not verify Inventor Hub admin access:",
          error.message,
        );
        setAccessState("blocked");
        return;
      }

      const role = String(profile?.role || "").trim().toLowerCase();
      setAccessState(role === "admin" ? "admin" : "blocked");
    }

    checkAdminAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      setAccessState("checking");
      checkAdminAccess();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (accessState === "checking") {
    return (
      <main
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 50% 35%, rgba(83,215,255,0.12), transparent 34%), #020813",
          color: "white",
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "28px",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: "48px",
              height: "48px",
              margin: "0 auto",
              borderRadius: "999px",
              border: "3px solid rgba(126,232,255,0.18)",
              borderTopColor: "#8ee8ff",
              animation: "inventor-hub-spin 800ms linear infinite",
            }}
          />

          <style>{`
            @keyframes inventor-hub-spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}</style>

          <p
            style={{
              margin: "16px 0 0",
              color: "rgba(255,255,255,0.68)",
              fontSize: "14px",
            }}
          >
            Checking Inventor Hub access...
          </p>
        </div>
      </main>
    );
  }

  if (accessState === "blocked") {
    return (
      <main
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 50% 28%, rgba(255,186,94,0.12), transparent 32%), radial-gradient(circle at 12% 12%, rgba(83,215,255,0.11), transparent 30%), #020813",
          color: "white",
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <section
          style={{
            position: "relative",
            width: "min(620px, 100%)",
            overflow: "hidden",
            borderRadius: "30px",
            border: "1px solid rgba(255,209,138,0.3)",
            background:
              "linear-gradient(145deg, rgba(24,25,47,0.96), rgba(7,13,30,0.98))",
            boxShadow:
              "0 40px 120px rgba(0,0,0,0.56), inset 0 0 60px rgba(255,186,94,0.035)",
            padding: "clamp(30px, 7vw, 56px)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "76px",
              height: "76px",
              margin: "0 auto",
              borderRadius: "24px",
              border: "1px solid rgba(255,209,138,0.34)",
              background:
                "radial-gradient(circle, rgba(255,186,94,0.2), rgba(25,15,31,0.9))",
              color: "#ffd18a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "34px",
              boxShadow: "0 0 34px rgba(255,186,94,0.1)",
            }}
          >
            ⌂
          </div>

          <p
            style={{
              margin: "24px 0 0",
              color: "#ffd18a",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            Coming Soon
          </p>

          <h1
            style={{
              margin: "12px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: "clamp(42px, 9vw, 68px)",
              lineHeight: 0.98,
              fontWeight: 400,
              letterSpacing: "-0.045em",
            }}
          >
            Inventor Hub
          </h1>

          <p
            style={{
              maxWidth: "480px",
              margin: "20px auto 0",
              color: "rgba(255,255,255,0.66)",
              fontSize: "16px",
              lineHeight: 1.65,
            }}
          >
            This zone is still being prepared. It is currently available only
            to administrators for preview, testing, and development.
          </p>

          <div
            style={{
              marginTop: "30px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Link
              href="/nova"
              style={{
                minHeight: "50px",
                padding: "0 22px",
                borderRadius: "14px",
                border: "1px solid rgba(126,232,255,0.3)",
                background: "rgba(83,215,255,0.1)",
                color: "white",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "9px",
                fontSize: "12px",
                fontWeight: 900,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
              }}
            >
              <span aria-hidden="true">←</span>
              Back to Nova’s World
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
