"use client";

import {
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ProfileStatus = {
  complete?: boolean;
  date_of_birth?: string | null;
  age_years?: number | null;
  age_band?: string | null;
};

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/profile";
  }

  return value;
}

function calculateAge(dateOfBirth: string) {
  if (!dateOfBirth) return null;

  const birthDate = new Date(`${dateOfBirth}T00:00:00`);
  const today = new Date();

  if (Number.isNaN(birthDate.getTime())) return null;

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={<CompleteProfileLoading />}>
      <CompleteProfileContent />
    </Suspense>
  );
}

function CompleteProfileLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#020813] px-4 text-white">
      Checking your learner profile...
    </main>
  );
}

function CompleteProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));

  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const age = useMemo(
    () => calculateAge(dateOfBirth),
    [dateOfBirth],
  );

  useEffect(() => {
    let cancelled = false;

    async function initialise() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        router.replace(
          `/login?next=${encodeURIComponent(
            `/complete-profile?next=${encodeURIComponent(nextPath)}`,
          )}`,
        );
        return;
      }

      const { data, error } = await supabase.rpc(
        "get_my_learning_profile_status",
      );

      if (cancelled) return;

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      const status = (data || {}) as ProfileStatus;

      if (status.complete) {
        router.replace(nextPath);
        return;
      }

      const pendingDateOfBirth =
        window.localStorage.getItem("pending-date-of-birth");

      const metadataDateOfBirth =
        typeof user.user_metadata?.date_of_birth === "string"
          ? user.user_metadata.date_of_birth
          : "";

      setDateOfBirth(
        status.date_of_birth ||
          pendingDateOfBirth ||
          metadataDateOfBirth ||
          "",
      );
      setLoading(false);
    }

    void initialise();

    return () => {
      cancelled = true;
    };
  }, [nextPath, router]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!dateOfBirth) {
      setMessage("Enter the learner's date of birth.");
      return;
    }

    if (age === null || age < 4 || age > 120) {
      setMessage("Please enter a valid date of birth.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc(
      "update_my_learning_profile",
      {
        p_date_of_birth: dateOfBirth,
      },
    );

    setSaving(false);

    if (error) {
      setMessage(error.message || "The learner profile could not be saved.");
      return;
    }

    window.localStorage.removeItem("pending-date-of-birth");
    window.dispatchEvent(new Event("learning-profile-updated"));
    router.replace(nextPath);
    router.refresh();
  }

  const today = new Date().toISOString().slice(0, 10);

  if (loading) {
    return <CompleteProfileLoading />;
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020813] px-4 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(83,215,255,0.2),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(174,99,255,0.16),transparent_36%)]" />

      <form
        onSubmit={saveProfile}
        className="relative z-10 w-full max-w-xl rounded-[34px] border border-cyan-200/20 bg-[#071329]/90 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-10"
      >
        <p className="m-0 text-xs font-extrabold uppercase tracking-[0.24em] text-cyan-200">
          Dreamscape One
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-[-0.05em]">
          Complete Your Learner Profile
        </h1>

        <p className="mt-4 text-sm leading-6 text-white/62 sm:text-base">
          Your date of birth helps Nova provide age-appropriate learning
          insights and recommendations. It does not change quiz marks or
          whether an answer is correct.
        </p>

        <label className="mt-8 block">
          <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.16em] text-white/60">
            Date of birth
          </span>

          <input
            type="date"
            required
            max={today}
            value={dateOfBirth}
            onChange={(event) => {
              setDateOfBirth(event.target.value);
              setMessage("");
            }}
            className="h-14 w-full rounded-2xl border border-cyan-200/20 bg-[#020a1b]/80 px-5 text-base text-white outline-none focus:border-cyan-200/55"
          />
        </label>

        {age !== null && age >= 0 && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
            <span className="text-sm text-white/55">Current age</span>
            <strong className="ml-3 text-lg text-white">
              {age} years old
            </strong>
          </div>
        )}

        {message && (
          <div className="mt-5 rounded-2xl border border-rose-300/25 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-7 h-14 w-full rounded-full bg-white px-5 text-sm font-extrabold uppercase tracking-[0.18em] text-[#071329] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save and Continue"}
        </button>

        <p className="mt-5 text-center text-xs leading-5 text-white/38">
          Core and Science Missions remain locked until this compulsory
          field is completed.
        </p>
      </form>
    </main>
  );
}
