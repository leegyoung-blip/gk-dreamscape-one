import type { Metadata } from "next";
import { notFound } from "next/navigation";
import InvoiceDocument from "../_components/InvoiceDocument";
import { loadPublicInvoiceDocument } from "@/lib/gkpBillingServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Invoice | Guru Kids Pro",
  description: "Secure Guru Kids Pro billing invoice.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

type InvoicePageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function PublicInvoicePage({ params }: InvoicePageProps) {
  const { token } = await params;
  const invoice = await loadPublicInvoiceDocument(token);

  if (!invoice) {
    notFound();
  }

  return <InvoiceDocument data={invoice} />;
}
