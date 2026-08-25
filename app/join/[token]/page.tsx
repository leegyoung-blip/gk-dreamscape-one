"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type JoinPreviewRow = {
  organisation_id: string;
  organisation_name: string;
  organisation_type: string;
  licence_type: string;
  is_pilot: boolean;
  starts_at: string;
  ends_at: string | null;
  status_code: string;
  status_message: string;
  can_join: boolean;
};

type JoinClaimRow = {
  organisation_id: string | null;
  organisation_name: string | null;
  licence_id: string | null;
  result_code: string;
  result_message: string;
  membership_id: string | null;
  student_reserved: number | null;
  student_seat_limit: number | null;
};

type PageState =
  | "loading"
  | "signed_out"
  | "joining"
  | "success"
  | "unavailable"
  | "error";

function labelOrganisationType(value: string | null | undefined) {
  return String(value || "education organisation")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function OrganisationStudentJoinPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = useMemo(() => String(params?.token || "").trim().toLowerCase(), [params]);
  const claimStarted = useRef(false);

  const [preview, setPreview] = useState<JoinPreviewRow | null>(null);
  const [claim, setClaim] = useState<JoinClaimRow | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [message, setMessage] = useState("Checking your organisation invitation...");

  const nextPath = `/join/${encodeURIComponent(token)}`;

  useEffect(() => {
    let cancelled = false;

    async function initialise() {
      setPageState("loading");
      setMessage("Checking your organisation invitation...");

      if (!/^[a-f0-9]{48}$/.test(token)) {
        setPageState("error");
        setMessage("This student join link is invalid.");
        return;
      }

      const { data: previewData, error: previewError } = await supabase.rpc(
        "get_organisation_student_join_preview",
        { p_join_code: token },
      );

      if (cancelled) return;

      if (previewError) {
        setPageState("error");
        setMessage(previewError.message || "This student join link could not be checked.");
        return;
      }

      const previewRows = (previewData || []) as JoinPreviewRow[];
      const nextPreview = previewRows[0] || null;

      if (!nextPreview) {
        setPageState("error");
        setMessage("This student join link is invalid or no longer exists.");
        return;
      }

      setPreview(nextPreview);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError) {
        console.warn("Student join session check:", userError.message);
      }

      if (!user) {
        setPageState(nextPreview.can_join ? "signed_out" : "unavailable");
        setMessage(nextPreview.status_message);
        return;
      }

      if (!nextPreview.can_join) {
        setPageState("unavailable");
        setMessage(nextPreview.status_message);
        return;
      }

      if (claimStarted.current) return;
      claimStarted.current = true;

      setPageState("joining");
      setMessage(`Connecting your Dreamscape account to ${nextPreview.organisation_name}...`);

      const { data: claimData, error: claimError } = await supabase.rpc(
        "claim_organisation_student_join_link",
        { p_join_code: token },
      );

      if (cancelled) return;

      if (claimError) {
        setPageState("error");
        setMessage(claimError.message || "Your organisation seat could not be assigned.");
        return;
      }

      const claimRows = (claimData || []) as JoinClaimRow[];
      const nextClaim = claimRows[0] || null;
      setClaim(nextClaim);

      if (!nextClaim) {
        setPageState("error");
        setMessage("Your organisation seat could not be assigned.");
        return;
      }

      if (nextClaim.result_code === "joined" || nextClaim.result_code === "already_member") {
        setPageState("success");
        setMessage(nextClaim.result_message);
        window.dispatchEvent(new Event("dreamscape-organisation-membership-updated"));
        return;
      }

      setPageState("unavailable");
      setMessage(nextClaim.result_message);
    }

    void initialise();

    return () => {
      cancelled = true;
    };
  }, [token]);

  function goToLogin(mode: "login" | "signup") {
    const query = new URLSearchParams();
    query.set("next", nextPath);
    if (mode === "signup") query.set("mode", "signup");
    router.push(`/login?${query.toString()}`);
  }

  const organisationName =
    preview?.organisation_name || claim?.organisation_name || "your education organisation";

  const title =
    pageState === "success"
      ? "You're connected"
      : pageState === "joining"
        ? "Joining your centre"
        : pageState === "error"
          ? "Link problem"
          : pageState === "unavailable"
            ? "Join link unavailable"
            : "Join your centre";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020813] px-4 py-10 text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(83,215,255,0.20),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(91,65,220,0.18),transparent_38%),linear-gradient(180deg,#07172d_0%,#020813_100%)]" />
        <div className="absolute left-[-140px] top-[-120px] h-[360px] w-[360px] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-120px] h-[380px] w-[380px] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <section className="relative z-10 w-full max-w-2xl rounded-[36px] border border-cyan-200/20 bg-[#071329]/88 p-6 text-center shadow-[0_30px_100px_rgba(0,0,0,0.52),0_0_50px_rgba(83,215,255,0.08)] backdrop-blur-2xl sm:p-10">
        <p className="m-0 text-xs font-extrabold uppercase tracking-[0.26em] text-[#7ee8ff]">
          Dreamscape One
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
          {title}
        </h1>

        {preview && (
          <div className="mx-auto mt-6 max-w-lg rounded-3xl border border-cyan-200/16 bg-cyan-300/[0.06] p-5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/42">
              Education organisation
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              {organisationName}
            </h2>
            <p className="mt-2 text-xs text-white/42">
              {labelOrganisationType(preview.organisation_type)}
              {preview.is_pilot ? " · Dreamscape Pilot" : ""}
            </p>
          </div>
        )}

        {(pageState === "loading" || pageState === "joining") && (
          <div className="mx-auto mt-8 h-11 w-11 animate-spin rounded-full border-2 border-white/15 border-t-cyan-300" />
        )}

        <p
          className={`mx-auto mt-6 max-w-lg text-sm leading-7 sm:text-base ${
            pageState === "success"
              ? "text-emerald-100"
              : pageState === "error" || pageState === "unavailable"
                ? "text-amber-100"
                : "text-white/62"
          }`}
        >
          {message}
        </p>

        {pageState === "signed_out" && (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => goToLogin("signup")}
              className="min-h-14 rounded-full bg-white px-5 text-xs font-extrabold uppercase tracking-[0.15em] text-[#071329] transition hover:scale-[1.01]"
            >
              Create Free Account
            </button>
            <button
              type="button"
              onClick={() => goToLogin("login")}
              className="min-h-14 rounded-full border border-cyan-200/26 bg-cyan-300/10 px-5 text-xs font-extrabold uppercase tracking-[0.15em] text-white transition hover:bg-cyan-300/16"
            >
              I Already Have an Account
            </button>
          </div>
        )}

        {pageState === "success" && (
          <div className="mt-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-200/28 bg-emerald-300/12 text-3xl text-emerald-100">
              ✓
            </div>
            <p className="mx-auto mt-5 max-w-lg text-sm leading-6 text-white/48">
              Your organisation membership is active. Your teachers can now include
              you in classes from the organisation roster.
            </p>
            <button
              type="button"
              onClick={() => router.replace("/profile")}
              className="mt-6 min-h-14 w-full rounded-full bg-white px-5 text-xs font-extrabold uppercase tracking-[0.15em] text-[#071329] transition hover:scale-[1.01]"
            >
              Continue to Dreamscape
            </button>
          </div>
        )}

        {(pageState === "unavailable" || pageState === "error") && (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="min-h-12 rounded-full border border-white/16 bg-white/[0.06] px-5 text-xs font-extrabold uppercase tracking-[0.13em] text-white"
            >
              Dreamscape Home
            </button>
            <a
              href="mailto:admin@gurukidspro.com?subject=Dreamscape%20Organisation%20Join%20Help"
              className="flex min-h-12 items-center justify-center rounded-full border border-cyan-200/20 bg-cyan-300/10 px-5 text-xs font-extrabold uppercase tracking-[0.13em] text-white no-underline"
            >
              Contact Support
            </a>
          </div>
        )}

        {pageState === "signed_out" && (
          <p className="mt-6 text-xs leading-5 text-white/36">
            Use the student&apos;s own Dreamscape account. The seat is assigned only
            after the account successfully joins this organisation.
          </p>
        )}
      </section>
    </main>
  );
}
