"use client";

import { useRouter } from "next/navigation";

export default function LearningProfileRequiredCard({
  returnTo,
  missionName = "Learning Missions",
}: {
  returnTo: string;
  missionName?: string;
}) {
  const router = useRouter();

  const completionHref =
    `/complete-profile?next=${encodeURIComponent(returnTo)}`;

  return (
    <div className="flex min-h-[420px] items-center justify-center px-4 py-10">
      <section className="w-full max-w-xl rounded-[30px] border border-cyan-200/20 bg-[#071329]/90 p-6 text-center text-white shadow-[0_28px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-9">
        <p className="m-0 text-xs font-extrabold uppercase tracking-[0.22em] text-cyan-200">
          Learner profile required
        </p>

        <h2 className="mt-4 text-3xl font-black tracking-[-0.04em]">
          Complete Your Learner Profile
        </h2>

        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/65 sm:text-base">
          Enter your date of birth so Nova can provide age-appropriate
          learning analysis and recommendations before you enter{" "}
          {missionName}.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => router.push(completionHref)}
            className="h-14 rounded-full bg-white px-5 text-sm font-extrabold text-[#071329] transition hover:scale-[1.01]"
          >
            Complete Profile
          </button>

          <button
            type="button"
            onClick={() => router.push("/learning-missions")}
            className="h-14 rounded-full border border-white/18 bg-white/5 px-5 text-sm font-bold text-white transition hover:bg-white/10"
          >
            Return to Missions
          </button>
        </div>
      </section>
    </div>
  );
}
