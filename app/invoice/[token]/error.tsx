"use client";

export default function InvoiceError() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#efe9de] p-6 text-[#17233a]">
      <section className="max-w-xl rounded-[2rem] border border-[#d7cdbb] bg-white p-8 text-center shadow-[0_24px_70px_rgba(21,35,59,0.1)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#15233b] text-sm font-black text-[#e8c474]">
          GKP
        </div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#9b7029]">
          Guru Kids Pro Billing
        </p>
        <h1 className="mt-3 text-3xl font-semibold">
          Invoice temporarily unavailable
        </h1>
        <p className="mt-4 leading-7 text-[#6f685c]">
          The invoice service could not load this document. Please try the link
          again or contact Guru Kids Pro for assistance.
        </p>
      </section>
    </main>
  );
}
