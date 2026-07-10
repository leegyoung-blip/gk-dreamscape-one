"use client";

import Link from "next/link";

const rates = [
  {
    service: "Standard PLA Printing",
    rate: "$0.12/g",
    note: "Best for prototypes, school projects, simple parts and display models.",
  },
  {
    service: "Premium Filament Printing",
    rate: "$0.18/g",
    note: "For silk, matte, translucent or special-look filament options.",
  },
  {
    service: "Minimum Print Charge",
    rate: "$15",
    note: "Applies to small print jobs.",
  },
  {
    service: "File Repair",
    rate: "From $10",
    note: "For files that need fixing before printing.",
  },
  {
    service: "Basic File Adjustment",
    rate: "From $20",
    note: "For simple resizing, name edits, splitting or minor adjustments.",
  },
  {
    service: "Bulk / Large Prints",
    rate: "Custom Quote",
    note: "For event items, repeated parts, larger models or long print jobs.",
  },
];

export default function PrintingServicesPage() {
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
        <div className="w-[960px] rounded-[2rem] bg-white/82 p-9 shadow-2xl backdrop-blur-md">
          <div className="text-center">
            <p className="text-sm font-medium tracking-[0.24em] text-amber-800/70">
              DREAMSHOP SERVICE
            </p>

            <h1 className="mt-4 text-5xl font-extralight leading-tight tracking-wide text-amber-950">
              3D Printing Services
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base font-light leading-7 text-amber-950/75">
              Already have a 3D file? Send it to us and we’ll help turn your
              digital model into a physical print.
            </p>
          </div>

          <div className="mt-8 overflow-hidden rounded-3xl bg-white/75 shadow-sm">
            <div className="grid grid-cols-[1.4fr_0.6fr_1.5fr] bg-amber-950 px-6 py-4 text-sm font-medium tracking-[0.12em] text-white">
              <p>SERVICE</p>
              <p>RATE</p>
              <p>BEST FOR</p>
            </div>

            {rates.map((item) => (
              <div
                key={item.service}
                className="grid grid-cols-[1.4fr_0.6fr_1.5fr] border-b border-amber-950/10 px-6 py-5 text-sm last:border-b-0"
              >
                <p className="font-medium text-amber-950">{item.service}</p>
                <p className="text-amber-800">{item.rate}</p>
                <p className="leading-6 text-amber-950/70">{item.note}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-3xl bg-amber-50/85 p-6 text-center">
            <h2 className="text-2xl font-light text-amber-950">
              How to get a quote
            </h2>

            <div className="mt-5 grid grid-cols-3 gap-4 text-left text-sm leading-6 text-amber-950/75">
              <div className="flex items-start gap-3 rounded-2xl bg-white/70 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-950 text-white">
                  1
                </span>
                <p>Send us your STL, OBJ or 3D model file.</p>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-white/70 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-950 text-white">
                  2
                </span>
                <p>We check the file, material needed and estimated print time.</p>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-white/70 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-950 text-white">
                  3
                </span>
                <p>We send you a quote before starting the print.</p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <a
              href="https://wa.me/6583888949?text=Hi%2C%20I%27m%20interested%20in%203D%20Printing%20Services.%20I%27d%20like%20to%20get%20a%20quote."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-full bg-amber-950 px-10 py-4 text-sm tracking-[0.16em] text-white transition hover:bg-amber-900"
            >
              GET A PRINTING QUOTE
            </a>

            <p className="mx-auto mt-5 max-w-xl text-xs leading-5 text-amber-950/60">
              Prices are estimates. Final quotation depends on print size,
              material, print time, complexity, finishing and quantity.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}