export default function IntroPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-20 text-indigo-950">
      <section className="mx-auto max-w-5xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-500">
          Dreamscape One
        </p>

        <h1 className="mt-5 text-5xl font-light tracking-[-0.04em] sm:text-7xl">
          Meet Dreamscape
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-indigo-950/60 sm:text-lg">
          A world where learning unlocks adventure, and every idea can become
          something real.
        </p>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <a
            href="/inventor"
            className="rounded-[32px] border border-violet-100 bg-violet-50 p-8 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-500">
              Nova’s World
            </p>

            <h2 className="mt-4 text-3xl font-semibold">Invent</h2>

            <p className="mt-4 leading-7 text-indigo-950/60">
              Learn, solve missions, and discover new ideas through invention.
            </p>
          </a>

          <a
            href="/milo-world"
            className="rounded-[32px] border border-orange-100 bg-orange-50 p-8 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">
              Milo’s World
            </p>

            <h2 className="mt-4 text-3xl font-semibold">Create</h2>

            <p className="mt-4 leading-7 text-indigo-950/60">
              Create, play, and bring ideas to life through design and making.
            </p>
          </a>
        </div>

        <a
          href="/"
          className="mt-12 inline-flex rounded-full bg-indigo-950 px-7 py-3 text-sm font-bold uppercase tracking-[0.14em] text-white"
        >
          Back to Home
        </a>
      </section>
    </main>
  );
}