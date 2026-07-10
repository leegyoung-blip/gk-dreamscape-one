"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function DreamscapeAccessContent() {
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/nova-world";

  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    setStatus("submitting");
    setError("");

    try {
      const response = await fetch("/api/dreamscape-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Incorrect password.");
      }

      window.location.href = redirectPath;
    } catch (error) {
      setStatus("error");
      setError(
        error instanceof Error ? error.message : "Could not verify password."
      );
    }
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        background:
          "radial-gradient(circle at top, rgba(126,232,255,0.18), transparent 36%), linear-gradient(180deg, #041124, #020813)",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <section
        style={{
          width: "min(480px, 100%)",
          borderRadius: "30px",
          border: "1px solid rgba(126,232,255,0.42)",
          background:
            "linear-gradient(180deg, rgba(14,55,104,0.92), rgba(4,26,64,0.98))",
          padding: "34px",
          boxShadow:
            "0 0 42px rgba(83,215,255,0.24), 0 28px 80px rgba(0,0,0,0.48)",
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#7ee8ff",
            fontSize: "13px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          Private Beta Access
        </p>

        <h1
          style={{
            margin: "16px 0 0",
            fontSize: "42px",
            lineHeight: 1,
            fontWeight: 800,
            letterSpacing: "-0.05em",
          }}
        >
          Dreamscape One
        </h1>

        <p
          style={{
            margin: "18px 0 0",
            color: "rgba(255,255,255,0.72)",
            fontSize: "16px",
            lineHeight: 1.55,
          }}
        >
          This beta is open to invited testers only. Enter the password to
          continue.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: "28px" }}>
          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
              setStatus("idle");
            }}
            placeholder="Enter beta password"
            style={{
              width: "100%",
              height: "54px",
              borderRadius: "16px",
              border: "1px solid rgba(126,232,255,0.32)",
              background: "rgba(255,255,255,0.08)",
              color: "white",
              padding: "0 16px",
              fontSize: "16px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          {status === "error" && (
            <div
              style={{
                marginTop: "14px",
                borderRadius: "14px",
                border: "1px solid rgba(255,120,120,0.35)",
                background: "rgba(255,90,90,0.12)",
                color: "#ffd4d4",
                padding: "12px 14px",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "submitting"}
            style={{
              marginTop: "20px",
              width: "100%",
              height: "56px",
              borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.42)",
              background:
                status === "submitting"
                  ? "rgba(255,255,255,0.12)"
                  : "linear-gradient(135deg, #35c5ff, #4c6dff)",
              color: "white",
              fontSize: "16px",
              fontWeight: 700,
              cursor: status === "submitting" ? "default" : "pointer",
              boxShadow: "0 0 24px rgba(83,215,255,0.32)",
            }}
          >
            {status === "submitting" ? "Checking..." : "Enter Dreamscape"}
          </button>
        </form>

        <p
          style={{
            margin: "22px 0 0",
            color: "rgba(255,255,255,0.5)",
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          For invited testers only.
        </p>
      </section>
    </main>
  );
}

export default function DreamscapeAccessPage() {
  return (
    <Suspense fallback={null}>
      <DreamscapeAccessContent />
    </Suspense>
  );
}