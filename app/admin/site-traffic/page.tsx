import SiteTrafficAdminPanel from "@/components/admin/SiteTrafficAdminPanel";

export const metadata = {
  title: "Site Traffic | Dreamscape Administration",
  robots: { index: false, follow: false },
};

export default function AdminSiteTrafficPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#020813] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(126,232,255,.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,.12),transparent_36%),linear-gradient(180deg,#041124_0%,#020813_100%)]" />
      <div className="relative mx-auto w-full max-w-[1500px]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <a href="/admin/dream-tokens?section=site-traffic" className="rounded-full border border-cyan-200/25 bg-white/[.08] px-5 py-3 text-sm text-white no-underline hover:border-cyan-200/50">← Dreamscape Admin</a>
          <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-cyan-200/65 hover:text-cyan-100">Open Vercel Dashboard ↗</a>
        </div>
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[.3em] text-[#7ee8ff]">Dreamscape Administration</p>
          <h1 className="mt-3 text-4xl font-light tracking-[-.045em] sm:text-6xl">Site Traffic</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">Production visitor and page-view reporting, powered by Vercel Web Analytics.</p>
        </div>
        <SiteTrafficAdminPanel />
      </div>
    </main>
  );
}
