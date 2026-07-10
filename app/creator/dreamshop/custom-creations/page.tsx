"use client";

import Link from "next/link";

const productOptions = [
  {
    title: "Custom Trophies & Awards",
    description: "For competitions, company milestones, school events and team recognition.",
  },
  {
    title: "Corporate Gift Sets",
    description: "Personalised items for clients, teams, staff appreciation and festive gifting.",
  },
  {
    title: "Event Souvenirs",
    description: "Small custom keepsakes for workshops, launches, celebrations and community events.",
  },
  {
    title: "Branded Keychains & Bag Tags",
    description: "Practical mass-gift items that can carry names, logos or event themes.",
  },
  {
    title: "Desk Name Plates",
    description: "Custom desk pieces for offices, teachers, students, teams or special guests.",
  },
  {
    title: "Display Stands & Table Signs",
    description: "Useful pieces for booths, counters, showcases, QR codes and product displays.",
  },
];

export default function CustomCreationsPage() {
  return (
    <main
      className="relative min-h-screen w-screen overflow-hidden bg-[#1a1008] text-amber-950"
      style={{
        backgroundImage: "url('/backgrounds/custom-creations-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/10" />

      <Link
        href="/creator/dreamshop"
        className="absolute left-8 top-8 z-30 rounded-full bg-white/85 px-5 py-2 text-sm font-light tracking-wide text-amber-950 shadow-md backdrop-blur-md transition hover:bg-white"
      >
        ← Back to Dreamshop
      </Link>

      <section className="relative z-20 flex min-h-screen items-center justify-center px-10 py-24">
        <div className="w-[920px] rounded-[2rem] bg-white/82 p-9 shadow-2xl backdrop-blur-md">
          <div className="text-center">
            <p className="text-sm font-medium tracking-[0.24em] text-amber-800/70">
              DREAMSHOP SERVICE
            </p>

            <h1 className="mt-4 text-5xl font-extralight leading-tight tracking-wide text-amber-950">
              Design & Custom Creations
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base font-light leading-7 text-amber-950/75">
              Have an idea for a gift, award or event item? We help turn rough
              sketches, references or simple requests into custom physical
              creations.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4">
            {productOptions.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl bg-amber-50/85 p-5 shadow-sm"
              >
                <h2 className="text-lg font-light leading-6 text-amber-950">
                  {item.title}
                </h2>

                <p className="mt-3 text-sm leading-6 text-amber-950/70">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-3xl bg-white/75 p-6">
            <h2 className="text-center text-2xl font-light text-amber-950">
              How it works
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-4 text-sm leading-6 text-amber-950/75">
              <div className="flex items-start gap-4 rounded-2xl bg-white/60 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-950 text-sm text-white">
                  1
                </span>
                <p>Share your idea, sketch, photo reference or request.</p>
              </div>

              <div className="flex items-start gap-4 rounded-2xl bg-white/60 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-950 text-sm text-white">
                  2
                </span>
                <p>We help shape it into a design or printable concept.</p>
              </div>

              <div className="flex items-start gap-4 rounded-2xl bg-white/60 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-950 text-sm text-white">
                  3
                </span>
                <p>You review and confirm before production.</p>
              </div>

              <div className="flex items-start gap-4 rounded-2xl bg-white/60 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-950 text-sm text-white">
                  4
                </span>
                <p>We turn the final design into something real.</p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <a
              href="https://wa.me/6583888949?text=Hi%2C%20I%27m%20interested%20in%20Design%20%26%20Custom%20Creations.%20I%27d%20like%20to%20start%20a%20custom%20request."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-full bg-amber-950 px-10 py-4 text-sm tracking-[0.16em] text-white transition hover:bg-amber-900"
            >
              START A CUSTOM REQUEST
            </a>

            <p className="mx-auto mt-5 max-w-xl text-xs leading-5 text-amber-950/60">
              Choose this service if you need help designing the item. This is
              ideal for custom gifts, awards, event items and bulk gifting.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}