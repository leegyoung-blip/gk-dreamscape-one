"use client";

export default function PrintInvoiceButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#15233b] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#243657]"
    >
      Print / Save PDF
    </button>
  );
}
