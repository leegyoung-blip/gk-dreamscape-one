"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const shell: CSSProperties = {
  minHeight: "100vh", padding: "max(7vh,32px) 20px",
  background: "radial-gradient(circle at 35% 15%,rgba(83,215,255,.16),transparent 32%),radial-gradient(circle at 70% 0%,rgba(197,140,255,.14),transparent 30%),#020813",
  color: "white", fontFamily: "Arial,Helvetica,sans-serif",
};
const btn: CSSProperties = {
  border: "none", background: "linear-gradient(90deg,#8ee8ff,#c58cff)", color: "#100622",
  padding: "15px 25px", borderRadius: 99, cursor: "pointer", fontWeight: 900,
  fontSize: 12, letterSpacing: ".08em", textDecoration: "none", display: "inline-block",
};

type ActivationResponse = {
  ok?: boolean;
  error?: string;
  code?: string;
  diagnosticId?: string;
  endsAt?: string;
  betaEntitlementVerified?: boolean;
};

export default function Founding50ActivationPage() {
  const [token, setToken] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [state, setState] = useState<"idle"|"busy"|"success"|"error">("idle");
  const [message, setMessage] = useState("");
  const [supportCode, setSupportCode] = useState("");
  const [accessConfirmed, setAccessConfirmed] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") || "");
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) setLoggedIn(Boolean(data.session?.access_token));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setLoggedIn(Boolean(session?.access_token));
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  async function activate() {
    if (state === "busy") return;
    setState("busy"); setMessage(""); setSupportCode("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please sign in with the parent email used for your application.");
      const headers = { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };
      const response = await fetch("/api/founding-50/activate", {
        method: "POST", headers, cache: "no-store", body: JSON.stringify({ token }),
      });
      const body = (await response.json().catch(() => ({}))) as ActivationResponse;
      if (!response.ok) {
        // An already activated user clicking an old token can safely recover
        // their current access. The access endpoint verifies *their own* ID.
        if (["F50_INVITE_NOT_FOUND", "F50_ALREADY_ACTIVATED"].includes(body.code || "")) {
          const status = await fetch("/api/founding-50/access", {
            headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store",
          });
          const details = await status.json().catch(() => ({}));
          if (status.ok && details?.active) {
            setAccessConfirmed(true);
            setState("success");
            setMessage(`Your Founding 50 NOVA+ beta is already active until ${new Date(details.endsAt).toLocaleDateString("en-SG")}.`);
            window.history.replaceState({}, "", "/founding-50/activate");
            return;
          }
        }
        if (body?.diagnosticId) setSupportCode(body.diagnosticId);
        throw new Error(body.error || "Unable to activate invitation.");
      }

      // Verify current DB entitlement, not client-side subscription state.
      const status = await fetch("/api/founding-50/access", {
        headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store",
      });
      const details = await status.json().catch(() => ({}));
      const active = status.ok && details?.active === true;
      setAccessConfirmed(active);
      setState("success");
      setMessage(active
        ? `Your 30-day Founding 50 NOVA+ beta is active until ${new Date(details.endsAt).toLocaleDateString("en-SG")}.`
        : "Your activation has been saved, but your access confirmation could not be retrieved. Please refresh or contact support before proceeding.");
      window.history.replaceState({}, "", "/founding-50/activate");
      window.dispatchEvent(new CustomEvent("dreamscape-access-changed", { detail: { source: "founding50_beta" } }));
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Activation failed.");
    }
  }

  return <main style={shell}>
    <div style={{ maxWidth: 740, margin: "0 auto", padding: "clamp(24px,5vw,48px)", border: "1px solid rgba(142,232,255,.25)", borderRadius: 32, background: "linear-gradient(145deg,rgba(5,17,34,.97),rgba(16,10,35,.97))", boxShadow: "0 25px 90px rgba(0,0,0,.4)" }}>
      <p style={{ fontSize: 12, color: "#8ee8ff", letterSpacing: ".2em", fontWeight: 900 }}>✦ DREAMSCAPE · FOUNDING 50</p>
      <h1 style={{ font: "normal clamp(34px,5vw,54px) Georgia,serif", lineHeight: 1.08 }}>Your Nova adventure begins here.</h1>
      <p style={{ color: "#cdd8e8", lineHeight: 1.75 }}>Sign in using the verified parent email from your application, then activate 30 days of complimentary NOVA+ beta access. Existing subscriptions and billing are unchanged.</p>
      {!token && state !== "success" && <p style={{ color: "#ffcbaf" }}>No invitation token found. Open the activation link in your most recent invitation email.</p>}
      {!loggedIn && state !== "success" && <div style={{ margin: "20px 0" }}>
        <Link href="/login" style={{ color: "#8ee8ff", fontWeight: 800 }}>Sign in or create your account →</Link>
        <p style={{ color: "#a7b7ca", fontSize: 13 }}>After signing in, return to this invitation link to activate.</p>
      </div>}
      {state === "error" && <div role="alert" style={{ padding: "14px 18px", border: "1px solid rgba(255,178,142,.3)", borderRadius: 16, background: "rgba(255,138,92,.08)", color: "#ffcbaf" }}>
        <p style={{ margin: 0 }}>{message}</p>
        {supportCode && <p style={{ fontSize: 12, marginBottom: 0 }}>Support reference: {supportCode}</p>}
      </div>}
      {state === "success" ? <div>
        <p role="status" style={{ color: accessConfirmed ? "#a4f0dc" : "#ffcbaf", lineHeight: 1.7 }}>{message}</p>
        {accessConfirmed ? <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/inventor" style={btn}>Explore Nova →</Link>
          <Link href="/founding-50/benefits" style={{ ...btn, background: "rgba(255,255,255,.08)", border: "1px solid rgba(142,232,255,.3)", color: "#8ee8ff" }}>My Benefits →</Link>
        </div> : <button onClick={() => window.location.reload()} style={btn}>Refresh access status →</button>}
      </div> : <button type="button" style={{ ...btn, opacity: !token || !loggedIn || state === "busy" ? .55 : 1 }} disabled={!token || !loggedIn || state === "busy"} onClick={() => void activate()}>
        {state === "busy" ? "ACTIVATING…" : "ACTIVATE 30 DAYS OF ACCESS →"}
      </button>}
    </div>
  </main>;
}
