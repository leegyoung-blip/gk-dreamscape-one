import Link from "next/link";

export function ScienceHeader({
  backHref = "/learning-missions",
  backLabel = "Learning Missions",
}: {
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="mb-6 flex items-center justify-between gap-4">
      <Link
        href={backHref}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate-200 backdrop-blur transition hover:border-cyan-300/40 hover:bg-white/10"
      >
        <span aria-hidden="true">←</span>
        <span>{backLabel}</span>
      </Link>

      <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-cyan-100">
        Nova Science Network
      </div>
    </header>
  );
}
