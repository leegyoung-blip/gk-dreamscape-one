import type { ReactNode } from "react";

export default function CoreMissionPageShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-[#020813] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(45,212,191,0.18),transparent_34%),radial-gradient(circle_at_90%_30%,rgba(56,189,248,0.12),transparent_26%),linear-gradient(180deg,#07182c_0%,#020813_72%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(126,232,255,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(126,232,255,0.25)_1px,transparent_1px)] [background-size:48px_48px]"
      />

      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-7 sm:py-7 lg:px-10">
        {children}
      </div>
    </main>
  );
}
