"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type JoinLinkRow = {
  join_link_id: string;
  join_code: string;
  link_status: string;
  licence_id: string;
  created_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
  successful_join_count: number;
};

function formatDateTime(value: string | null) {
  if (!value) return "Not used yet";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not used yet";

  return date.toLocaleString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function StudentJoinLinkPanel({
  organisationId,
  organisationName,
}: {
  organisationId: string;
  organisationName: string;
}) {
  const [joinLink, setJoinLink] = useState<JoinLinkRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const joinUrl = useMemo(() => {
    if (!joinLink?.join_code || typeof window === "undefined") return "";
    return `${window.location.origin}/join/${joinLink.join_code}`;
  }, [joinLink]);

  async function loadLink() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "get_organisation_student_join_link",
      { p_organisation_id: organisationId },
    );

    if (error) {
      setJoinLink(null);
      setErrorMessage(error.message || "The student join link could not be loaded.");
      setLoading(false);
      return;
    }

    const rows = (data || []) as JoinLinkRow[];
    setJoinLink(rows[0] || null);
    setLoading(false);
  }

  useEffect(() => {
    void loadLink();
  }, [organisationId]);

  async function generateLink(replaceExisting = false) {
    if (
      replaceExisting &&
      !window.confirm(
        "Replace the current student join link? The old link will stop working immediately.",
      )
    ) {
      return;
    }

    setWorking(true);
    setMessage("");
    setErrorMessage("");
    setCopied(false);

    const rpcName = replaceExisting
      ? "regenerate_organisation_student_join_link"
      : "create_organisation_student_join_link";

    const { data, error } = await supabase.rpc(rpcName, {
      p_organisation_id: organisationId,
    });

    setWorking(false);

    if (error) {
      setErrorMessage(error.message || "The student join link could not be generated.");
      return;
    }

    const rows = (data || []) as JoinLinkRow[];
    const next = rows[0] || null;
    setJoinLink(next);
    setMessage(
      replaceExisting
        ? "A new student join link is active. The previous link has been disabled."
        : "Student join link created. You can now share it with your students.",
    );
  }

  async function disableLink() {
    if (
      !window.confirm(
        "Disable this student join link? Students who have not joined yet will no longer be able to use it.",
      )
    ) {
      return;
    }

    setWorking(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "revoke_organisation_student_join_link",
      { p_organisation_id: organisationId },
    );

    setWorking(false);

    if (error) {
      setErrorMessage(error.message || "The student join link could not be disabled.");
      return;
    }

    setJoinLink(null);
    setCopied(false);
    setMessage("Student join link disabled.");
  }

  async function copyLink() {
    if (!joinUrl) return;

    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="mt-6 rounded-[32px] border border-emerald-200/20 bg-[linear-gradient(145deg,rgba(16,92,77,0.20),rgba(4,20,48,0.86))] p-6 shadow-[0_22px_64px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
            Student Onboarding
          </p>
          <h2 className="mt-2 text-3xl font-bold">Student Join Link</h2>
          <p className="mt-3 text-sm leading-6 text-white/52">
            Share one link with students from {organisationName}. Students create or log
            into their own Dreamscape account and are connected automatically while
            student seats remain available. A link does not reserve a seat until a
            student successfully joins.
          </p>
        </div>

        <span className="w-fit rounded-full border border-emerald-200/20 bg-emerald-300/10 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-emerald-100">
          Students only
        </span>
      </div>

      {message && (
        <p className="mt-5 rounded-2xl border border-green-200/20 bg-green-400/10 px-5 py-4 text-sm text-green-100">
          {message}
        </p>
      )}

      {errorMessage && (
        <p className="mt-5 rounded-2xl border border-red-200/20 bg-red-400/10 px-5 py-4 text-sm text-red-100">
          {errorMessage}
        </p>
      )}

      {loading ? (
        <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4 text-sm text-white/46">
          Loading student join link...
        </p>
      ) : !joinLink ? (
        <div className="mt-5 rounded-3xl border border-dashed border-emerald-200/22 bg-black/16 p-6">
          <p className="text-sm font-bold text-white">No active student join link.</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/46">
            Generate one when you are ready to invite students. The same link can be
            shared by email, WhatsApp, Telegram or your centre&apos;s normal parent and
            student communication channels.
          </p>

          <button
            type="button"
            disabled={working}
            onClick={() => void generateLink(false)}
            className="mt-5 min-h-12 rounded-full border border-emerald-200/28 bg-emerald-300/14 px-6 text-xs font-extrabold uppercase tracking-[0.12em] text-emerald-50 transition hover:bg-emerald-300/22 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {working ? "Generating..." : "Generate Student Join Link"}
          </button>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
          <div className="rounded-3xl border border-emerald-200/18 bg-black/18 p-5">
            <label className="block">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-white/40">
                Active student link
              </span>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <input
                  readOnly
                  value={joinUrl}
                  className="min-h-12 min-w-0 flex-1 rounded-2xl border border-emerald-200/16 bg-[#061632]/88 px-4 text-sm text-white outline-none"
                />
                <button
                  type="button"
                  disabled={!joinUrl}
                  onClick={() => void copyLink()}
                  className="min-h-12 shrink-0 rounded-full border border-emerald-200/26 bg-emerald-300/14 px-6 text-xs font-extrabold uppercase tracking-[0.12em] text-white disabled:opacity-45"
                >
                  {copied ? "Copied" : "Copy Link"}
                </button>
              </div>
            </label>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={working}
                onClick={() => void generateLink(true)}
                className="min-h-11 rounded-full border border-violet-200/22 bg-violet-300/10 px-5 text-[10px] font-extrabold uppercase tracking-[0.11em] text-violet-100 disabled:opacity-45"
              >
                Replace Link
              </button>
              <button
                type="button"
                disabled={working}
                onClick={() => void disableLink()}
                className="min-h-11 rounded-full border border-red-200/22 bg-red-400/10 px-5 text-[10px] font-extrabold uppercase tracking-[0.11em] text-red-100 disabled:opacity-45"
              >
                Disable Link
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/38">
                Link joins
              </p>
              <strong className="mt-2 block text-3xl text-emerald-200">
                {Number(joinLink.successful_join_count || 0).toLocaleString()}
              </strong>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/38">
                Last used
              </p>
              <strong className="mt-2 block text-sm leading-5 text-white/76">
                {formatDateTime(joinLink.last_used_at)}
              </strong>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] px-5 py-4 text-xs leading-5 text-white/42">
        Approved-email onboarding remains available below. Use approved emails when
        you want to reserve specific seats in advance; use the join link when you want
        students to self-enrol from a centre-shared link.
      </div>
    </section>
  );
}
