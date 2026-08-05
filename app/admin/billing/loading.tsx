export default function BillingDashboardLoading() {
  return (
    <main className="min-h-screen bg-[#f5f2ea] p-6 text-[#15233b]">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-10 w-64 rounded-xl bg-[#e6dfd0]" />
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-36 rounded-3xl border border-[#dfd5c1] bg-white"
            />
          ))}
        </div>
        <div className="mt-6 h-96 rounded-3xl border border-[#dfd5c1] bg-white" />
      </div>
    </main>
  );
}
