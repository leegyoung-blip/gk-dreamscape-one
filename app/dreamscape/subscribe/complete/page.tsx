import Link from "next/link";

export default async function DreamscapeSubscriptionCompletePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#020813] px-5 py-12 text-white">
      <section className="w-full max-w-2xl rounded-[32px] border border-cyan-200/22 bg-white/[0.05] p-8 text-center shadow-[0_28px_90px_rgba(0,0,0,0.42)] sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8ee8ff]">
          Dreamscape Student Access
        </p>

        <h1 className="mt-5 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
          Payment received.
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/62">
          Your subscription payment has been received. Dreamscape is
          securely confirming the subscription and activating the
          learner&apos;s access.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/learning-missions"
            className="flex min-h-12 items-center justify-center rounded-full bg-white px-5 text-sm font-black text-[#160729] no-underline"
          >
            Go to Learning Missions
          </Link>

          <Link
            href="/profile"
            className="flex min-h-12 items-center justify-center rounded-full border border-white/16 bg-white/[0.05] px-5 text-sm font-black text-white no-underline"
          >
            My Account
          </Link>
        </div>

        <p className="mt-6 text-xs leading-5 text-white/36">
          Access normally updates within a few moments after payment confirmation.
        </p>
      </section>
    </main>
  );
}
